const jwt = require('jsonwebtoken');

/**
 * Gateway JWT verifier.
 * Verifies the token, extracts user info, injects as headers.
 * Downstream services read X-User-Id and X-User-Role — they don't re-verify JWT.
 */
exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'shopkart_super_secret_jwt');
    req.user = decoded;

    // Inject user info as trusted headers for downstream services
    req.headers['x-user-id']   = decoded.id;
    req.headers['x-user-role'] = decoded.role || 'user';
    req.headers['x-user-email']= decoded.email || '';

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired, please login again' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};
