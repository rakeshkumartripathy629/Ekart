const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination } = require('../utils/pagination');
const {
  publishOrderPlaced,
  publishOrderCancelled,
  publishOrderStatusUpdated,
  publishOrderReturned,
} = require('../events/publishers');
const axios = require('axios');

// ── Internal service HTTP clients ─────────────────
// Order service calls cart-service and auth-service ONLY to read data needed for order creation.
// All write operations are done via Kafka events — NEVER direct DB writes to other services.
const authServiceUrl  = process.env.AUTH_SERVICE_URL  || 'http://auth-service:3001';
const cartServiceUrl  = process.env.CART_SERVICE_URL  || 'http://cart-service:3003';

const getCartFromService = async (userId, token) => {
  const res = await axios.get(`${cartServiceUrl}/api/cart`, {
    headers: { 'x-user-id': userId, 'x-user-role': 'user' },
  });
  return res.data.cart;
};

const getUserFromService = async (userId) => {
  const res = await axios.get(`${authServiceUrl}/api/users/internal/${userId}`, {
    headers: { 'x-user-id': userId, 'x-user-role': 'user' },
  });
  return res.data.user;
};

// ── PLACE ORDER ───────────────────────────────────
exports.placeOrder = asyncHandler(async (req, res) => {
  const { shippingAddressId, paymentMethod, notes } = req.body;
  const userId = req.headers['x-user-id'];

  // Fetch cart from cart-service via HTTP (read-only)
  let cart;
  try {
    cart = await getCartFromService(userId);
  } catch {
    throw ApiError.badRequest('Could not fetch cart. Please try again.');
  }

  if (!cart || !cart.items || cart.items.length === 0)
    throw ApiError.badRequest('Your cart is empty');

  // Fetch user from auth-service via HTTP (read-only)
  let user;
  try {
    user = await getUserFromService(userId);
  } catch {
    throw ApiError.internal('Could not fetch user info');
  }

  const address = shippingAddressId
    ? user.addresses?.find(a => a._id === shippingAddressId)
    : user.addresses?.find(a => a.isDefault);

  if (!address) throw ApiError.badRequest('Please add a shipping address first');

  // Compute totals from cart data
  const subtotal       = cart.subtotal   || 0;
  const mrpTotal       = cart.mrpTotal   || subtotal;
  const discount       = mrpTotal - subtotal;
  const deliveryCharge = cart.deliveryCharge || (subtotal >= 499 ? 0 : 29);
  const couponDiscount = cart.couponDiscount || 0;
  const total          = Math.max(0, subtotal - couponDiscount + deliveryCharge);

  const order = await Order.create({
    user: userId,
    items: cart.items.map(i => ({
      product: i.product?._id || i.product,
      name: i.name, emoji: i.emoji, brand: i.brand, image: i.image,
      price: i.price, mrp: i.mrp, qty: i.qty, variant: i.variant, seller: i.seller,
    })),
    shippingAddress: {
      fullName:     address.fullName,
      phone:        address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || '',
      city:         address.city,
      state:        address.state,
      pincode:      address.pincode,
      landmark:     address.landmark || '',
    },
    subtotal, mrpTotal, discount, deliveryCharge,
    couponCode: cart.couponCode, couponDiscount, total,
    paymentMethod,
    paymentStatus: paymentMethod === 'cod' ? 'pending' : 'initiated',
    estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    awb: `BD${Math.floor(Math.random() * 90000000 + 10000000)}`,
    notes,
  });

  // ✅ Publish Kafka event — cart-service, payment-service, product-service,
  //    notification-service all react independently via their consumers
  await publishOrderPlaced(order, user);

  ApiResponse.created(res, '🎉 Order placed successfully!', { order });
});

// ── GET MY ORDERS ─────────────────────────────────
exports.getMyOrders = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const { page, limit, skip } = getPagination(req.query);
  const userId = req.headers['x-user-id'];
  const query = { user: userId };
  if (status) query.status = status;

  const [total, orders] = await Promise.all([
    Order.countDocuments(query),
    Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
  ]);

  ApiResponse.paginated(res, 'Orders fetched', { data: orders, total, page, limit });
});

// ── GET SINGLE ORDER ──────────────────────────────
exports.getOrder = asyncHandler(async (req, res) => {
  const userId = req.headers['x-user-id'];
  const role   = req.headers['x-user-role'];
  const order  = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.user.toString() !== userId && role !== 'admin')
    throw ApiError.forbidden('Not authorized');
  ApiResponse.success(res, 'Order fetched', { order });
});

// ── TRACK ORDER ───────────────────────────────────
exports.trackOrder = asyncHandler(async (req, res) => {
  const userId = req.headers['x-user-id'];
  const role   = req.headers['x-user-role'];
  const order = await Order.findOne({ orderId: req.params.orderId })
    .select('orderId status tracking estimatedDelivery deliveredAt awb carrier shippingAddress items user');
  if (!order) throw ApiError.notFound('Order not found');
  if (order.user?.toString() !== userId && role !== 'admin')
    throw ApiError.forbidden('Not authorized');
  ApiResponse.success(res, 'Tracking info', { order });
});

// ── CANCEL ORDER ──────────────────────────────────
exports.cancelOrder = asyncHandler(async (req, res) => {
  const userId = req.headers['x-user-id'];
  const order  = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.user.toString() !== userId) throw ApiError.forbidden('Not authorized');

  const cancelable = ['placed', 'confirmed', 'packed'];
  if (!cancelable.includes(order.status))
    throw ApiError.badRequest(`Cannot cancel an order in "${order.status}" status`);

  order.status       = 'cancelled';
  order.cancelReason = req.body.reason || 'Cancelled by customer';
  order.tracking.push({ status: 'Order Cancelled', description: order.cancelReason, time: new Date() });
  await order.save();

  // Fetch user for email
  let user = { email: '', name: 'Customer' };
  try { user = await getUserFromService(userId); } catch { /* email optional */ }

  // ✅ Kafka event → product-service restores stock, payment-service initiates refund
  await publishOrderCancelled(order, user);

  ApiResponse.success(res, 'Order cancelled successfully', { order });
});

// ── RETURN ORDER ──────────────────────────────────
exports.returnOrder = asyncHandler(async (req, res) => {
  const userId = req.headers['x-user-id'];
  const order  = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.user.toString() !== userId) throw ApiError.forbidden('Not authorized');
  if (order.status !== 'delivered') throw ApiError.badRequest('Only delivered orders can be returned');

  order.status = 'returned';
  order.returnReason = req.body.reason || 'Return requested by customer';
  order.tracking.push({ status: 'Return Initiated', description: order.returnReason, time: new Date() });
  await order.save();

  // ✅ Kafka event → product-service restores stock, notification-service notifies
  await publishOrderReturned(order);

  ApiResponse.success(res, 'Return request submitted', { order });
});

// ── ADMIN: UPDATE STATUS ──────────────────────────
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, description, location } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');

  const statusMeta = {
    confirmed:        'Order Confirmed',
    packed:           'Order Packed',
    shipped:          'Order Shipped',
    out_for_delivery: 'Out for Delivery',
    delivered:        'Order Delivered',
  };

  order.status = status;
  order.tracking.push({
    status: statusMeta[status] || status,
    description: description || `Status updated to ${status}`,
    location: location || '',
    time: new Date(),
  });
  if (status === 'delivered') { order.deliveredAt = new Date(); order.paymentStatus = 'paid'; }
  await order.save();

  // ✅ Kafka event → notification-service sends push + email
  await publishOrderStatusUpdated(order, status, description);

  ApiResponse.success(res, 'Order status updated', { order });
});

// ── ADMIN: ALL ORDERS ─────────────────────────────
exports.getAllOrders = asyncHandler(async (req, res) => {
  const { status, search, paymentStatus } = req.query;
  const { page, limit, skip } = getPagination(req.query);
  const query = {};
  if (status) query.status = status;
  if (paymentStatus) query.paymentStatus = paymentStatus;
  if (search) query.$or = [
    { orderId: { $regex: search, $options: 'i' } },
    { 'shippingAddress.fullName': { $regex: search, $options: 'i' } },
  ];

  const [total, orders] = await Promise.all([
    Order.countDocuments(query),
    Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
  ]);

  ApiResponse.paginated(res, 'Orders fetched', { data: orders, total, page, limit });
});

exports.getOrderStats = async (req, res) => {
  try {
    const stats = await require('../models/Order').aggregate([{$group:{_id:'$status',count:{$sum:1},revenue:{$sum:'$total'}}}]);
    require('../utils/ApiResponse').success(res,'Order stats',{stats});
  } catch(err){ res.status(500).json({success:false,message:err.message}); }
};
