/**
 * Middleware de validación de requests
 */

const { body, param, validationResult } = require('express-validator');
const { ValidationException } = require('../exceptions');
const { isValidMode, getAllModes } = require('../domain');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
      value: error.value,
    }));

    throw new ValidationException(
      'Error de validación',
      errorMessages
    );
  }
  
  next();
};

const joinMatchmakingValidation = [
  body('playerId')
    .notEmpty()
    .withMessage('El ID del jugador no puede estar vacío')
    .isString()
    .withMessage('El ID del jugador debe ser una cadena de texto')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('El ID del jugador debe tener entre 1 y 100 caracteres'),
  
  body('mode')
    .notEmpty()
    .withMessage('El modo de juego no puede estar vacío')
    .isString()
    .withMessage('El modo de juego debe ser una cadena de texto')
    .toUpperCase()
    .custom((value) => {
      if (!isValidMode(value)) {
        throw new Error(`Modo inválido. Modos válidos: ${getAllModes().join(', ')}`);
      }
      return true;
    }),
  
  validate,
];

const roomIdValidation = [
  param('roomId')
    .notEmpty()
    .withMessage('El ID de la sala es requerido')
    .isString()
    .withMessage('El ID de la sala debe ser una cadena de texto')
    .matches(/^room_[a-f0-9]{8}$/)
    .withMessage('Formato de ID de sala inválido'),
  
  validate,
];

const playerIdValidation = [
  param('playerId')
    .notEmpty()
    .withMessage('El ID del jugador es requerido')
    .isString()
    .withMessage('El ID del jugador debe ser una cadena de texto')
    .trim(),
  
  validate,
];

const leaveMatchmakingValidation = [
  body('playerId')
    .notEmpty()
    .withMessage('El ID del jugador no puede estar vacío')
    .isString()
    .withMessage('El ID del jugador debe ser una cadena de texto')
    .trim(),
  
  body('mode')
    .notEmpty()
    .withMessage('El modo de juego no puede estar vacío')
    .toUpperCase()
    .custom((value) => {
      if (!isValidMode(value)) {
        throw new Error(`Modo inválido. Modos válidos: ${getAllModes().join(', ')}`);
      }
      return true;
    }),
  
  validate,
];

module.exports = {
  validate,
  joinMatchmakingValidation,
  roomIdValidation,
  playerIdValidation,
  leaveMatchmakingValidation,
};