exports.notFound = (req, res, next) => { const e = new Error(`Not found: ${req.method} ${req.originalUrl}`); e.statusCode = 404; next(e); };
exports.errorHandler = (err, req, res, next) => {
  let s = err.statusCode || 500, m = err.message || 'Internal Server Error';
  if (err.name === 'CastError') { m = 'Invalid ID'; s = 400; }
  if (err.code === 11000) { const f = Object.keys(err.keyValue || {})[0] || 'Field'; m = `${f} already exists`; s = 409; }
  if (err.name === 'ValidationError') { m = Object.values(err.errors).map(e => e.message).join(', '); s = 400; }
  if (err.name === 'JsonWebTokenError') { m = 'Invalid token'; s = 401; }
  if (err.name === 'TokenExpiredError') { m = 'Token expired'; s = 401; }
  res.status(s).json({ success: false, message: m });
};
