/**
 * Controlador REST de Matchmaking
 */

const express = require('express');
const { matchmakingService, roomService } = require('../services');
const { getGameModeByName } = require('../domain');
const { RoomResponse } = require('../dto');
const {
  asyncHandler,
  joinMatchmakingValidation,
  roomIdValidation,
  playerIdValidation,
  leaveMatchmakingValidation,
} = require('../middleware');
const logger = require('../config/logger');

const router = express.Router();

// POST /matchmaking/join
router.post(
  '/join',
  joinMatchmakingValidation,
  asyncHandler(async (req, res) => {
    const { playerId, mode } = req.body;
    const gameMode = getGameModeByName(mode);
    logger.debug(`Solicitud de join: ${playerId} en modo ${mode}`);
    const response = await matchmakingService.joinMatchmaking(playerId, gameMode);
    res.status(200).json(response.toJSON());
  })
);

// POST /matchmaking/leave
router.post(
  '/leave',
  leaveMatchmakingValidation,
  asyncHandler(async (req, res) => {
    const { playerId, mode } = req.body;
    const gameMode = getGameModeByName(mode);
    logger.debug(`Solicitud de leave: ${playerId} de modo ${mode}`);
    const removed = await matchmakingService.leaveMatchmaking(playerId, gameMode);
    res.status(200).json({
      success: removed,
      message: removed
        ? 'Has salido de la cola de matchmaking'
        : 'No estabas en la cola de matchmaking',
    });
  })
);

// GET /matchmaking/status/:playerId
router.get(
  '/status/:playerId',
  playerIdValidation,
  asyncHandler(async (req, res) => {
    const { playerId } = req.params;
    const status = await matchmakingService.getPlayerStatus(playerId);
    res.status(200).json(status);
  })
);

// GET /matchmaking/queue/:mode
router.get(
  '/queue/:mode',
  asyncHandler(async (req, res) => {
    const { mode } = req.params;
    const gameMode = getGameModeByName(mode.toUpperCase());
    
    if (!gameMode) {
      return res.status(400).json({
        error: 'INVALID_MODE',
        message: 'Modo de juego inválido',
      });
    }
    
    const queueSize = await matchmakingService.getQueueSize(gameMode);
    res.status(200).json({
      mode: gameMode.name,
      queueSize,
      timestamp: Date.now(),
    });
  })
);

// GET /matchmaking/stats
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const stats = await matchmakingService.getStats();
    res.status(200).json(stats);
  })
);

// GET /matchmaking/rooms
router.get(
  '/rooms',
  asyncHandler(async (req, res) => {
    const { mode, status } = req.query;
    let rooms;
    
    if (mode) {
      rooms = await roomService.getRoomsByMode(mode.toUpperCase());
    } else if (status) {
      rooms = await roomService.getRoomsByStatus(status.toUpperCase());
    } else {
      rooms = await roomService.getAllRooms();
    }
    
    const response = rooms.map((room) => RoomResponse.fromGameRoom(room).toJSON());
    res.status(200).json({
      count: response.length,
      rooms: response,
    });
  })
);

// GET /matchmaking/rooms/:roomId
router.get(
  '/rooms/:roomId',
  roomIdValidation,
  asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    const room = await roomService.getRoomById(roomId);
    const response = RoomResponse.fromGameRoom(room);
    res.status(200).json(response.toJSON());
  })
);

// POST /matchmaking/rooms/:roomId/start
router.post(
  '/rooms/:roomId/start',
  roomIdValidation,
  asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    const isReady = await roomService.isRoomReady(roomId);
    
    if (!isReady) {
      return res.status(400).json({
        error: 'ROOM_NOT_READY',
        message: 'La sala no está lista para comenzar',
      });
    }
    
    await roomService.markRoomAsInProgress(roomId);
    const room = await roomService.getRoomById(roomId);
    res.status(200).json({
      success: true,
      message: 'Partida iniciada',
      room: RoomResponse.fromGameRoom(room).toJSON(),
    });
  })
);

// POST /matchmaking/rooms/:roomId/finish
router.post(
  '/rooms/:roomId/finish',
  roomIdValidation,
  asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    await roomService.markRoomAsFinished(roomId);
    const room = await roomService.getRoomById(roomId);
    res.status(200).json({
      success: true,
      message: 'Partida finalizada',
      room: RoomResponse.fromGameRoom(room).toJSON(),
    });
  })
);

// DELETE /matchmaking/rooms/:roomId
router.delete(
  '/rooms/:roomId',
  roomIdValidation,
  asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    await roomService.deleteRoom(roomId);
    res.status(200).json({
      success: true,
      message: `Sala ${roomId} eliminada`,
    });
  })
);

module.exports = router;