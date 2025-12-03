/**
 * Middleware de Rate Limiting
 * Previene spam y abuso de la API
 */

const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

/**
 * Rate limiter general para todas las rutas
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite de 100 requests por ventana
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Demasiadas solicitudes desde esta IP, por favor intenta más tarde.',
    retryAfter: '15 minutos',
  },
  standardHeaders: true, // Retorna rate limit info en headers `RateLimit-*`
  legacyHeaders: false, // Deshabilita headers `X-RateLimit-*`
  handler: (req, res) => {
    logger.warn('Rate limit excedido', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Demasiadas solicitudes, por favor intenta más tarde.',
      retryAfter: Math.ceil(req.rateLimit.resetTime.getTime() - Date.now()) / 1000,
    });
  },
});

/**
 * Rate limiter estricto para operaciones de matchmaking
 * Previene que jugadores spameen join/leave
 */
const matchmakingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // máximo 10 requests por minuto
  message: {
    error: 'MATCHMAKING_RATE_LIMIT',
    message: 'Estás intentando unirte/salir de matchmaking demasiado rápido.',
  },
  skip: (req) => {
    // Si no hay playerId, dejar pasar (será manejado por validación)
    return !req.body.playerId && !req.params.playerId;
  },
  handler: (req, res) => {
    const playerId = req.body.playerId || req.params.playerId;
    logger.warn('Rate limit de matchmaking excedido', {
      playerId,
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      error: 'MATCHMAKING_RATE_LIMIT',
      message: 'Estás realizando demasiadas acciones. Por favor espera un momento.',
      retryAfter: Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000),
    });
  },
});

/**
 * Rate limiter para consultas (más permisivo)
 */
const queryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // máximo 30 requests por minuto
  message: {
    error: 'QUERY_RATE_LIMIT',
    message: 'Demasiadas consultas en poco tiempo.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter muy estricto para operaciones de administración
 */
const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // máximo 5 requests por minuto
  message: {
    error: 'ADMIN_RATE_LIMIT',
    message: 'Límite de operaciones administrativas excedido.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  generalLimiter,
  matchmakingLimiter,
  queryLimiter,
  adminLimiter,
};
