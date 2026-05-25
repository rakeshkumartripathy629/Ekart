const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { verifyToken } = require('./middleware/authVerify');
const { rateLimitMiddleware } = require('./middleware/rateLimit');

const app = express();

// ── CORS ──────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

// ── Global rate limiter ───────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests' },
}));

// ── Health check ──────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    upstreams: {
      auth:         process.env.AUTH_SERVICE_URL,
      product:      process.env.PRODUCT_SERVICE_URL,
      cart:         process.env.CART_SERVICE_URL,
      order:        process.env.ORDER_SERVICE_URL,
      payment:      process.env.PAYMENT_SERVICE_URL,
      notification: process.env.NOTIFICATION_SERVICE_URL,
      admin:        process.env.ADMIN_SERVICE_URL,
    },
  });
});

// ── Proxy factory ─────────────────────────────────
const proxy = (target, pathRewrite = {}) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite,
    on: {
      error: (err, req, res) => {
        console.error(`[Gateway] Proxy error → ${target}: ${err.message}`);
        res.status(502).json({ success: false, message: 'Service unavailable', service: target });
      },
    },
  });

// ── PUBLIC routes — no auth needed ───────────────
// Auth service: register, login, forgot/reset password
app.use('/api/auth', proxy(process.env.AUTH_SERVICE_URL || 'http://auth-service:3001'));

// Products: public read routes only
app.use('/api/products', proxy(process.env.PRODUCT_SERVICE_URL || 'http://product-service:3002'));
app.use('/api/categories', proxy(process.env.PRODUCT_SERVICE_URL || 'http://product-service:3002'));

// Payment webhooks (gateway handles before auth — must be raw)
app.use('/api/payments/confirm', proxy(process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3005'));
app.use('/api/payments/fail',    proxy(process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3005'));

// ── PROTECTED routes — JWT required ──────────────
// Gateway verifies token; sets X-User-Id, X-User-Role headers
// Downstream services trust these headers — they do NOT call auth again

app.use('/api/cart',          verifyToken, proxy(process.env.CART_SERVICE_URL         || 'http://cart-service:3003'));
app.use('/api/wishlist',      verifyToken, proxy(process.env.CART_SERVICE_URL         || 'http://cart-service:3003'));
app.use('/api/coupons',       verifyToken, proxy(process.env.CART_SERVICE_URL         || 'http://cart-service:3003'));
app.use('/api/orders',        verifyToken, proxy(process.env.ORDER_SERVICE_URL        || 'http://order-service:3004'));
app.use('/api/payments',      verifyToken, proxy(process.env.PAYMENT_SERVICE_URL      || 'http://payment-service:3005'));
app.use('/api/notifications', verifyToken, proxy(process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3006'));
app.use('/api/support',       verifyToken, proxy(process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3006'));
app.use('/api/users',         verifyToken, proxy(process.env.AUTH_SERVICE_URL         || 'http://auth-service:3001'));

// ── ADMIN routes — JWT + admin role ──────────────
app.use('/api/admin', verifyToken, (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required' });
  next();
}, proxy(process.env.ADMIN_SERVICE_URL || 'http://admin-service:3007'));

// ── 404 ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

module.exports = app;
