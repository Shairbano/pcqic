
const TechnicalLog = require('../models/TechnicalLog');

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const notFoundHandler = (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
};

const globalErrorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  const type =
    err.name === 'ValidationError' ? 'validation_error' :
    (err.name === 'MongoServerError' || err.name === 'CastError') ? 'database_error' :
    statusCode === 403 ? 'permission_denied' :
    'server_error';

  TechnicalLog.log({
    level:      'error',
    type,
    userId:     req.user?._id,
    endpoint:   req.originalUrl,
    method:     req.method,
    statusCode,
    message:    err.message,
    stack:      err.stack,
    ip:         req.ip,
  });

  console.error(`[${req.method} ${req.originalUrl}]`, err);

  if (res.headersSent) return next(err);
  res.status(statusCode).json({ success: false, message: err.message || 'Server error' });
};

module.exports = { asyncHandler, notFoundHandler, globalErrorHandler };