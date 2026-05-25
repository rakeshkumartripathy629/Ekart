const Cart = require('../models/Cart');
const Coupon = require('../models/Coupon');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const axios = require('axios');

const productServiceUrl = process.env.PRODUCT_SERVICE_URL || 'http://product-service:3002';

// ── Fetch product info from product-service (HTTP) ─
// Cart service does NOT import Product model from product-service's DB.
// It calls product-service API to validate stock before adding to cart.
const fetchProduct = async (productId) => {
  const res = await axios.get(`${productServiceUrl}/api/products/${productId}`);
  return res.data.product;
};

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [] });
  return cart;
};

exports.getCart = asyncHandler(async (req, res) => {
  const userId = req.headers['x-user-id'];
  const cart = await Cart.findOne({ user: userId });
  if (!cart) return ApiResponse.success(res, 'Cart is empty', { cart: { items: [], itemCount: 0, subtotal: 0, total: 0 } });
  ApiResponse.success(res, 'Cart fetched', { cart });
});

exports.addToCart = asyncHandler(async (req, res) => {
  const { productId, qty = 1, variant = '' } = req.body;
  const userId = req.headers['x-user-id'];

  // ✅ Fetch product from product-service via HTTP — not from its DB directly
  let product;
  try {
    product = await fetchProduct(productId);
  } catch {
    throw ApiError.notFound('Product not found or unavailable');
  }

  if (!product.isActive) throw ApiError.notFound('Product not available');
  if (product.stock < qty) throw ApiError.badRequest(`Only ${product.stock} units in stock`);

  const cart = await getOrCreateCart(userId);
  const existing = cart.items.find(i => i.product.toString() === productId && i.variant === variant);

  if (existing) {
    if (existing.qty + qty > product.stock)
      throw ApiError.badRequest(`Only ${product.stock} units available`);
    existing.qty += qty;
  } else {
    cart.items.push({
      product: productId,
      name: product.name, emoji: product.emoji, brand: product.brand,
      image: product.images?.[0] || '',
      price: product.price, mrp: product.mrp,
      qty, variant, seller: product.seller,
    });
  }

  await cart.save();
  ApiResponse.success(res, 'Added to cart 🛒', { cart, itemCount: cart.itemCount });
});

exports.updateQty = asyncHandler(async (req, res) => {
  const { itemId, qty } = req.body;
  const userId = req.headers['x-user-id'];
  if (qty < 1) throw ApiError.badRequest('Quantity must be at least 1');

  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw ApiError.notFound('Cart not found');

  const item = cart.items.id(itemId);
  if (!item) throw ApiError.notFound('Item not in cart');

  // Validate stock via product-service
  try {
    const product = await fetchProduct(item.product.toString());
    if (qty > product.stock) throw ApiError.badRequest(`Only ${product.stock} units available`);
  } catch (err) {
    if (err.statusCode) throw err;
    // Product service unavailable — allow update anyway (graceful degradation)
  }

  item.qty = qty;
  await cart.save();
  ApiResponse.success(res, 'Cart updated', { cart, itemCount: cart.itemCount });
});

exports.removeItem = asyncHandler(async (req, res) => {
  const userId = req.headers['x-user-id'];
  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw ApiError.notFound('Cart not found');
  cart.items = cart.items.filter(i => i._id.toString() !== req.params.itemId);
  cart.couponCode = undefined; cart.couponDiscount = 0;
  await cart.save();
  ApiResponse.success(res, 'Item removed', { cart, itemCount: cart.itemCount });
});

exports.clearCart = asyncHandler(async (req, res) => {
  const userId = req.headers['x-user-id'];
  await Cart.findOneAndUpdate({ user: userId }, { items: [], couponCode: undefined, couponDiscount: 0 });
  ApiResponse.success(res, 'Cart cleared');
});

exports.applyCoupon = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const userId = req.headers['x-user-id'];
  const cart = await Cart.findOne({ user: userId });
  if (!cart || cart.items.length === 0) throw ApiError.badRequest('Cart is empty');

  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
  if (!coupon) throw ApiError.notFound('Invalid coupon code');
  if (coupon.validTill && coupon.validTill < new Date()) throw ApiError.badRequest('Coupon expired');
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw ApiError.badRequest('Coupon usage limit reached');
  if (cart.subtotal < coupon.minOrderValue) throw ApiError.badRequest(`Minimum order ₹${coupon.minOrderValue} required`);

  let discount = coupon.discountType === 'flat'
    ? coupon.discountValue
    : Math.round((cart.subtotal * coupon.discountValue) / 100);
  if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);

  cart.couponCode = coupon.code; cart.couponDiscount = discount;
  await cart.save();
  ApiResponse.success(res, `🎉 Coupon applied! You save ₹${discount}`, { couponDiscount: discount, cart });
});

exports.removeCoupon = asyncHandler(async (req, res) => {
  const userId = req.headers['x-user-id'];
  await Cart.findOneAndUpdate({ user: userId }, { couponCode: undefined, couponDiscount: 0 });
  ApiResponse.success(res, 'Coupon removed');
});
