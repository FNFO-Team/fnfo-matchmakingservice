/**
 * Controlador REST de Matchmaking
 * ARCHIVO ACTUALIZADO - Incluye endpoint para unirse a sala por código
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

// ========================================
// NUEVO: POST /matchmaking/join-room
// Unirse a una sala existente por código
// ========================================
router.post(
  '/join-room',
  asyncHandler(async (req, res) => {
    const { playerId, roomId } = req.body;

    if (!playerId || !roomId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PARAMS',
        message: 'playerId y roomId son requeridos',
      });
    }

    logger.debug(`Solicitud de join-room: ${playerId} a sala ${roomId}`);

    try {
      // Verificar si la sala existe
      const room = await roomService.getRoomById(roomId);

      if (!room) {
        return res.status(404).json({
          success: false,
          error: 'ROOM_NOT_FOUND',
          message: `La sala ${roomId} no existe`,
        });
      }

      // Verificar si la sala está llena
      if (room.isFull()) {
        return res.status(409).json({
          success: false,
          error: 'ROOM_FULL',
          message: 'La sala está llena',
        });
      }

      // Verificar si el jugador ya está en la sala
      if (room.players.includes(playerId)) {
        return res.status(200).json({
          success: true,
          message: 'Ya estás en esta sala',
          room: RoomResponse.fromGameRoom(room).toJSON(),
        });
      }

      // Verificar si la sala está en estado válido para unirse
      if (room.status !== 'FORMING' && room.status !== 'READY') {
        return res.status(409).json({
          success: false,
          error: 'ROOM_NOT_AVAILABLE',
          message: 'La sala no está disponible para unirse',
        });
      }

      // Agregar jugador a la sala
      const added = await roomService.addPlayerToRoom(roomId, playerId);

      if (!added) {
        return res.status(500).json({
          success: false,
          error: 'JOIN_FAILED',
          message: 'No se pudo unir a la sala',
        });
      }

      // Obtener sala actualizada
      const updatedRoom = await roomService.getRoomById(roomId);

      // Publicar notificación de nuevo jugador
      await matchmakingService.publishRoomNotification(updatedRoom);

      logger.info(`Jugador ${playerId} se unió a sala ${roomId} por código`);

      res.status(200).json({
        success: true,
        message: 'Te has unido a la sala',
        room: RoomResponse.fromGameRoom(updatedRoom).toJSON(),
      });
    } catch (error) {
      if (error.name === 'RoomNotFoundException') {
        return res.status(404).json({
          success: false,
          error: 'ROOM_NOT_FOUND',
          message: `La sala ${roomId} no existe`,
        });
      }
      throw error;
    }
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
  asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    
    try {
      const room = await roomService.getRoomById(roomId);
      const response = RoomResponse.fromGameRoom(room);
      res.status(200).json(response.toJSON());
    } catch (error) {
      if (error.name === 'RoomNotFoundException') {
        return res.status(404).json({
          error: 'ROOM_NOT_FOUND',
          message: `La sala ${roomId} no existe`,
        });
      }
      throw error;
    }
  })
);

// POST /matchmaking/rooms/:roomId/start
router.post(
  '/rooms/:roomId/start',
  asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    
    try {
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
    } catch (error) {
      if (error.name === 'RoomNotFoundException') {
        return res.status(404).json({
          error: 'ROOM_NOT_FOUND',
          message: `La sala ${roomId} no existe`,
        });
      }
      throw error;
    }
  })
);

// POST /matchmaking/rooms/:roomId/finish
router.post(
  '/rooms/:roomId/finish',
  asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    
    try {
      await roomService.markRoomAsFinished(roomId);
      const room = await roomService.getRoomById(roomId);
      res.status(200).json({
        success: true,
        message: 'Partida finalizada',
        room: RoomResponse.fromGameRoom(room).toJSON(),
      });
    } catch (error) {
      if (error.name === 'RoomNotFoundException') {
        return res.status(404).json({
          error: 'ROOM_NOT_FOUND',
          message: `La sala ${roomId} no existe`,
        });
      }
      throw error;
    }
  })
);

// DELETE /matchmaking/rooms/:roomId
router.delete(
  '/rooms/:roomId',
  asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    
    try {
      await roomService.deleteRoom(roomId);
      res.status(200).json({
        success: true,
        message: `Sala ${roomId} eliminada`,
      });
    } catch (error) {
      if (error.name === 'RoomNotFoundException') {
        return res.status(404).json({
          error: 'ROOM_NOT_FOUND',
          message: `La sala ${roomId} no existe`,
        });
      }
      throw error;
    }
  })
);

module.exports = router;