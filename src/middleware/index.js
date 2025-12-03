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

module.exports = {
  notFoundHandler,
  errorHandler,
  asyncHandler,
  validate,
  joinMatchmakingValidation,
  roomIdValidation,
  playerIdValidation,
  leaveMatchmakingValidation,
};