const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
exports.protect = asyncHandler(async (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId) throw ApiError.unauthorized('No user context — call via API Gateway');
  req.user = { _id: userId, id: userId, role: req.headers['x-user-role'] || 'user', email: req.headers['x-user-email'] || '' };
  next();
});
exports.optionalAuth = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (userId) req.user = { _id: userId, id: userId, role: req.headers['x-user-role'] || 'user' };
  next();
};
