/**
 * Middleware para manejo global de errores
 */

const logger = require('../config/logger');
const { ErrorResponse } = require('../dto');
const {
  MatchmakingException,
  RoomNotFoundException,
  ValidationException,
} = require('../exceptions');

const notFoundHandler = (req, res, next) => {
  const error = new ErrorResponse({
    error: 'NOT_FOUND',
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
    status: 404,
  });
  res.status(404).json(error.toJSON());
};

const errorHandler = (err, req, res, next) => {
  logger.error('Error capturado', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err instanceof RoomNotFoundException) {
    return res.status(404).json(err.toJSON());
  }

  if (err instanceof ValidationException) {
    return res.status(400).json(err.toJSON());
  }

  if (err instanceof MatchmakingException) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  if (err.array && typeof err.array === 'function') {
    const validationErrors = err.array();
    const error = new ErrorResponse({
      error: 'VALIDATION_ERROR',
      message: validationErrors.map((e) => `${e.path}: ${e.msg}`).join(', '),
      status: 400,
    });
    return res.status(400).json(error.toJSON());
  }

  const error = new ErrorResponse({
    error: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Error interno del servidor',
    status: 500,
  });

  res.status(500).json(error.toJSON());
};

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  notFoundHandler,
  errorHandler,
  asyncHandler,
};