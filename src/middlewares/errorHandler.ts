import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ApiError } from '../utils/ApiError';

// ✅ Use Express's built-in ErrorRequestHandler type
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error('Error:', err.message || err);

  // If response headers are already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle ApiError instances
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: err.success || false,
      message: err.message || 'Error',
      errors: err.errors || [],
      data: err.data || null
    });
    return; // ✅ Explicit return without value
  }

  // Handle JWT-specific errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      message: 'Invalid token. Please log in again.'
    });
    return; // ✅ Explicit return without value
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      message: 'Token expired. Please log in again.'
    });
    return; // ✅ Explicit return without value
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: Object.values(err.errors || {})
    });
    return; // ✅ Explicit return without value
  }

  // Default error response
  res.status(err.status || err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
  return; // ✅ Explicit return without value
};
