/**
 * Exportaciones del módulo de middleware
 */

const { notFoundHandler, errorHandler, asyncHandler } = require('./errorHandler');
const {
  validate,
  joinMatchmakingValidation,
  roomIdValidation,
  playerIdValidation,
  leaveMatchmakingValidation,
} = require('./validation');
const {
  generalLimiter,
  matchmakingLimiter,
  queryLimiter,
  adminLimiter,
} = require('./rateLimiter');
const { socketRateLimiter, createSocketRateLimitMiddleware } = require('./socketRateLimiter');

module.exports = {
  notFoundHandler,
  errorHandler,
  asyncHandler,
  validate,
  joinMatchmakingValidation,
  roomIdValidation,
  playerIdValidation,
  leaveMatchmakingValidation,
  generalLimiter,
  matchmakingLimiter,
  queryLimiter,
  adminLimiter,
  socketRateLimiter,
  createSocketRateLimitMiddleware,
};