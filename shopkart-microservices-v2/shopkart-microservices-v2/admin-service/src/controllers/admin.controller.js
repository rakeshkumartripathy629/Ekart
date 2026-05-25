const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination } = require('../utils/pagination');
const axios = require('axios');
const Banner = require('../models/Banner');
const StoreSetting = require('../models/StoreSetting');

const svcUrl = (name) => ({
  auth:    process.env.AUTH_SERVICE_URL    || 'http://auth-service:3001',
  product: process.env.PRODUCT_SERVICE_URL || 'http://product-service:3002',
  order:   process.env.ORDER_SERVICE_URL   || 'http://order-service:3004',
  payment: process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3005',
})[name];

const svcGet = async (service, path, headers={}) => {
  const res = await axios.get(`${svcUrl(service)}${path}`, { headers });
  return res.data;
};

// Dashboard — aggregates from all services
exports.getDashboard = asyncHandler(async (req, res) => {
  const h = { 'x-user-id': req.headers['x-user-id'], 'x-user-role': 'admin' };
  const [usersData, productsData, ordersData, paymentsData] = await Promise.allSettled([
    svcGet('auth', '/api/users/internal/stats', h),
    svcGet('product', '/api/products/internal/stats', h),
    svcGet('order', '/api/orders/admin/stats', h),
    svcGet('payment', '/api/payments/internal/stats', h),
  ]);
  const lowStock = await axios.get(`${svcUrl('product')}/api/products?inStock=false&limit=5`, { headers: h }).then(r=>r.data.data).catch(()=>[]);
  const recentOrders = await axios.get(`${svcUrl('order')}/api/orders/admin/all?limit=5`, { headers: h }).then(r=>r.data.data).catch(()=>[]);
  ApiResponse.success(res, 'Dashboard data', {
    stats: {
      totalUsers:    usersData.value?.total || 0,
      totalProducts: productsData.value?.total || 0,
      totalOrders:   ordersData.value?.stats?.reduce((s,x)=>s+x.count,0) || 0,
      totalRevenue:  paymentsData.value?.totalRevenue || 0,
    },
    recentOrders,
    lowStock,
    orderByStatus: ordersData.value?.stats || [],
  });
});

// Analytics — from order + payment services
exports.getAnalytics = asyncHandler(async (req, res) => {
  const { period = '30' } = req.query;
  const h = { 'x-user-id': req.headers['x-user-id'], 'x-user-role': 'admin' };
  const [salesData, paymentsData] = await Promise.allSettled([
    svcGet('order', `/api/orders/admin/analytics?period=${period}`, h),
    svcGet('payment', `/api/payments/internal/analytics?period=${period}`, h),
  ]);
  ApiResponse.success(res, 'Analytics', {
    salesByDay:     salesData.value?.salesByDay || [],
    paymentMethods: paymentsData.value?.paymentMethods || [],
    orderStatusDist: salesData.value?.orderStatusDist || [],
  });
});

// Users — proxy to auth-service
exports.getUsers = asyncHandler(async (req, res) => {
  const h = { 'x-user-id': req.headers['x-user-id'], 'x-user-role': 'admin' };
  const qs = new URLSearchParams(req.query).toString();
  const data = await svcGet('auth', `/api/users/admin/all?${qs}`, h);
  res.json(data);
});

exports.toggleUser = asyncHandler(async (req, res) => {
  const h = { 'x-user-id': req.headers['x-user-id'], 'x-user-role': 'admin' };
  const resp = await axios.patch(`${svcUrl('auth')}/api/users/admin/${req.params.id}/toggle`, {}, { headers: h });
  res.json(resp.data);
});

// Orders — proxy to order-service
exports.getAllOrders = asyncHandler(async (req, res) => {
  const h = { 'x-user-id': req.headers['x-user-id'], 'x-user-role': 'admin' };
  const qs = new URLSearchParams(req.query).toString();
  const data = await svcGet('order', `/api/orders/admin/all?${qs}`, h);
  res.json(data);
});

exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const h = { 'x-user-id': req.headers['x-user-id'], 'x-user-role': 'admin' };
  const resp = await axios.patch(`${svcUrl('order')}/api/orders/admin/${req.params.id}/status`, req.body, { headers: h });
  res.json(resp.data);
});

// Banners
exports.getBanners = asyncHandler(async (req,res) => {
  const { position } = req.query;
  const q = { isActive: true };
  if (position) q.position = position;
  const banners = await Banner.find(q).sort({ sortOrder: 1 });
  ApiResponse.success(res, 'Banners fetched', { banners });
});
exports.createBanner = asyncHandler(async (req,res) => {
  const data = { ...req.body };
  if (req.file) data.image = `/uploads/banners/${req.file.filename}`;
  const banner = await Banner.create(data);
  ApiResponse.created(res, 'Banner created', { banner });
});
exports.updateBanner = asyncHandler(async (req,res) => {
  const data = { ...req.body };
  if (req.file) data.image = `/uploads/banners/${req.file.filename}`;
  const banner = await Banner.findByIdAndUpdate(req.params.id, data, { new: true });
  if (!banner) throw ApiError.notFound('Banner not found');
  ApiResponse.success(res, 'Banner updated', { banner });
});
exports.deleteBanner = asyncHandler(async (req,res) => {
  await Banner.findByIdAndDelete(req.params.id);
  ApiResponse.success(res, 'Banner deleted');
});

// Inventory — proxy to product-service
exports.getLowStock = asyncHandler(async (req,res) => {
  const h = { 'x-user-id': req.headers['x-user-id'], 'x-user-role': 'admin' };
  const data = await svcGet('product', `/api/products/internal/low-stock?threshold=${req.query.threshold||10}`, h);
  res.json(data);
});
exports.restockProduct = asyncHandler(async (req,res) => {
  const h = { 'x-user-id': req.headers['x-user-id'], 'x-user-role': 'admin' };
  const resp = await axios.post(`${svcUrl('product')}/api/products/internal/restock`, req.body, { headers: h });
  res.json(resp.data);
});

// Store Settings
exports.getSettings = asyncHandler(async (req,res) => {
  const settings = await StoreSetting.find();
  ApiResponse.success(res, 'Settings fetched', { settings });
});
exports.updateSetting = asyncHandler(async (req,res) => {
  const { key, value, label, group, isPublic } = req.body;
  const setting = await StoreSetting.set(key, value, { label, group, isPublic });
  ApiResponse.success(res, 'Setting updated', { setting });
});
