/**
 * Exportaciones del módulo de dominio
 */

const { GameMode, getByName: getGameModeByName, isValidMode, getAllModes } = require('./GameMode');
const { RoomStatus, getByName: getRoomStatusByName, isValidStatus } = require('./RoomStatus');
const Player = require('./Player');
const GameRoom = require('./GameRoom');

module.exports = {
  GameMode,
  RoomStatus,
  getGameModeByName,
  isValidMode,
  getAllModes,
  getRoomStatusByName,
  isValidStatus,
  Player,
  GameRoom,
};