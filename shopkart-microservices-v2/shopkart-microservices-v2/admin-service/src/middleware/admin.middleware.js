const ApiError = require('../utils/ApiError');
exports.adminOnly = (req, res, next) => {
  if (req.headers['x-user-role'] === 'admin') return next();
  throw ApiError.forbidden('Admin access required');
};
