/**
 * Configuración de Socket.IO para comunicación WebSocket
 */

const { Server } = require('socket.io');
const { getRedisClient, getRedisSubscriber } = require('./redis');
const config = require('./index');
const logger = require('./logger');

let io = null;

/**
 * Inicializa Socket.IO con el servidor HTTP
 */
const initializeSocketIO = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
  });

  // Middleware de autenticación
  io.use((socket, next) => {
    const playerId = socket.handshake.auth.playerId || socket.handshake.query.playerId;
    
    if (!playerId) {
      return next(new Error('Player ID requerido'));
    }
    
    socket.playerId = playerId;
    logger.debug(`Socket auth: ${playerId}`);
    next();
  });

  // Manejar conexiones
  io.on('connection', (socket) => {
    handleConnection(socket);
  });

  // Suscribirse a eventos de Redis Pub/Sub
  subscribeToRedisEvents();

  logger.info('Socket.IO inicializado');
  return io;
};

/**
 * Maneja una nueva conexión de socket
 */
const handleConnection = (socket) => {
  const playerId = socket.playerId;
  logger.info(`Cliente conectado: ${playerId} (${socket.id})`);

  // Unir al jugador a su sala personal
  socket.join(`player:${playerId}`);

  // Evento: get-status
  socket.on('get-status', async () => {
    try {
      const { matchmakingService } = require('../services');
      const status = await matchmakingService.getPlayerStatus(playerId);
      socket.emit('player-status', status);
    } catch (error) {
      logger.error('Error en get-status', { error: error.message, playerId });
      socket.emit('matchmaking-error', {
        error: 'STATUS_ERROR',
        message: error.message,
      });
    }
  });

  // Evento: join-matchmaking
  socket.on('join-matchmaking', async (data) => {
    try {
      const { matchmakingService } = require('../services');
      const { getGameModeByName } = require('../domain');
      
      const { mode } = data;
      const gameMode = getGameModeByName(mode);

      if (!gameMode) {
        socket.emit('matchmaking-error', {
          error: 'INVALID_MODE',
          message: 'Modo de juego inválido',
        });
        return;
      }

      const response = await matchmakingService.joinMatchmaking(playerId, gameMode);
      socket.join(`queue:${gameMode.name}`);

      socket.emit('matchmaking-joined', {
        success: true,
        message: response.message,
        queuePosition: response.queuePosition,
        waitingPlayers: response.waitingPlayers,
        mode: gameMode.name,
      });

      socket.to(`queue:${gameMode.name}`).emit('queue-updated', {
        waitingPlayers: response.waitingPlayers,
        mode: gameMode.name,
      });

      logger.info(`${playerId} unido a matchmaking ${gameMode.name}`);
    } catch (error) {
      logger.error('Error en join-matchmaking', { error: error.message, playerId });
      socket.emit('matchmaking-error', {
        error: error.name || 'MATCHMAKING_ERROR',
        message: error.message,
      });
    }
  });

  // Evento: leave-matchmaking
  socket.on('leave-matchmaking', async (data) => {
    try {
      const { matchmakingService } = require('../services');
      const { getGameModeByName } = require('../domain');
      
      const { mode } = data;
      const gameMode = getGameModeByName(mode);

      if (!gameMode) {
        socket.emit('matchmaking-error', {
          error: 'INVALID_MODE',
          message: 'Modo de juego inválido',
        });
        return;
      }

      const removed = await matchmakingService.leaveMatchmaking(playerId, gameMode);
      socket.leave(`queue:${gameMode.name}`);

      socket.emit('matchmaking-left', {
        success: removed,
        mode: gameMode.name,
      });

      const queueSize = await matchmakingService.getQueueSize(gameMode);
      io.to(`queue:${gameMode.name}`).emit('queue-updated', {
        waitingPlayers: queueSize,
        mode: gameMode.name,
      });

      logger.info(`${playerId} salió de matchmaking ${gameMode.name}`);
    } catch (error) {
      logger.error('Error en leave-matchmaking', { error: error.message, playerId });
      socket.emit('matchmaking-error', {
        error: 'LEAVE_ERROR',
        message: error.message,
      });
    }
  });

  // Evento: get-queue-info
  socket.on('get-queue-info', async () => {
    try {
      const { matchmakingService } = require('../services');
      const stats = await matchmakingService.getStats();
      socket.emit('queue-info', stats);
    } catch (error) {
      logger.error('Error en get-queue-info', { error: error.message });
      socket.emit('matchmaking-error', {
        error: 'QUEUE_INFO_ERROR',
        message: error.message,
      });
    }
  });

  // Evento: join-room
  socket.on('join-room', async (data) => {
    try {
      const { roomService } = require('../services');
      const { roomId } = data;
      const room = await roomService.getRoomById(roomId);

      if (!room.players.includes(playerId)) {
        socket.emit('room-error', {
          error: 'NOT_IN_ROOM',
          message: 'No estás en esta sala',
        });
        return;
      }

      socket.join(`room:${roomId}`);
      socket.emit('room-joined', {
        roomId: room.roomId,
        players: room.players,
        mode: room.mode,
        status: room.status,
      });

      logger.debug(`${playerId} se unió a sala socket ${roomId}`);
    } catch (error) {
      logger.error('Error en join-room', { error: error.message, playerId });
      socket.emit('room-error', {
        error: 'JOIN_ROOM_ERROR',
        message: error.message,
      });
    }
  });

  // Evento: player-ready
  socket.on('player-ready', async (data) => {
    try {
      const { roomId } = data;
      socket.to(`room:${roomId}`).emit('player-ready-update', {
        playerId,
        roomId,
      });
      logger.debug(`${playerId} está listo en sala ${roomId}`);
    } catch (error) {
      logger.error('Error en player-ready', { error: error.message });
    }
  });

  // Evento: leave-room
  socket.on('leave-room', async (data) => {
    try {
      const { roomService } = require('../services');
      const { roomId } = data;
      
      await roomService.removePlayerFromRoom(roomId, playerId);
      socket.leave(`room:${roomId}`);

      io.to(`room:${roomId}`).emit('player-left', {
        playerId,
        roomId,
      });

      socket.emit('room-left', { roomId });
      logger.info(`${playerId} salió de sala ${roomId}`);
    } catch (error) {
      logger.error('Error en leave-room', { error: error.message, playerId });
    }
  });

  // Desconexión
  socket.on('disconnect', async (reason) => {
    logger.info(`Cliente desconectado: ${playerId} (${reason})`);

    try {
      const { matchmakingService, roomService } = require('../services');
      const { GameMode } = require('../domain');

      await matchmakingService.leaveMatchmaking(playerId, GameMode.PVP);
      await matchmakingService.leaveMatchmaking(playerId, GameMode.BOSS);

      const room = await roomService.getPlayerRoom(playerId);
      if (room) {
        io.to(`room:${room.roomId}`).emit('player-disconnected', {
          playerId,
          roomId: room.roomId,
        });
      }
    } catch (error) {
      logger.error('Error en cleanup de desconexión', { error: error.message });
    }
  });

  socket.on('error', (error) => {
    logger.error('Error de socket', { error: error.message, playerId });
  });
};

/**
 * Suscribe a eventos de Redis Pub/Sub
 */
const subscribeToRedisEvents = () => {
  const subscriber = getRedisSubscriber();

  subscriber.subscribe(config.channels.roomNotifications, (err) => {
    if (err) {
      logger.error('Error al suscribirse a canal de notificaciones', { error: err.message });
      return;
    }
    logger.info(`Suscrito a canal: ${config.channels.roomNotifications}`);
  });

  subscriber.on('message', (channel, message) => {
    if (channel === config.channels.roomNotifications) {
      handleRoomNotification(message);
    }
  });
};

/**
 * Maneja notificaciones de sala desde Redis Pub/Sub
 */
const handleRoomNotification = (message) => {
  try {
    const event = JSON.parse(message);
    
    logger.info('Notificación de sala recibida', {
      roomId: event.roomId,
      players: event.players,
      mode: event.mode,
    });

    event.players.forEach((playerId) => {
      io.to(`player:${playerId}`).emit('room-found', {
        roomId: event.roomId,
        players: event.players,
        mode: event.mode,
        timestamp: event.timestamp,
      });
    });

    const queueRoom = `queue:${event.mode}`;
    event.players.forEach((playerId) => {
      const sockets = io.sockets.adapter.rooms.get(`player:${playerId}`);
      if (sockets) {
        sockets.forEach((socketId) => {
          const socket = io.sockets.sockets.get(socketId);
          if (socket) {
            socket.leave(queueRoom);
          }
        });
      }
    });

  } catch (error) {
    logger.error('Error al procesar notificación de sala', { error: error.message });
  }
};

/**
 * Obtiene la instancia de Socket.IO
 */
const getIO = () => io;

/**
 * Emite un evento a todos los clientes
 */
const broadcast = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

/**
 * Emite un evento a una sala específica
 */
const emitToRoom = (room, event, data) => {
  if (io) {
    io.to(room).emit(event, data);
  }
};

/**
 * Emite un evento a un jugador específico
 */
const emitToPlayer = (playerId, event, data) => {
  if (io) {
    io.to(`player:${playerId}`).emit(event, data);
  }
};

// ⚠️ IMPORTANTE: Este export es necesario
module.exports = {
  initializeSocketIO,
  getIO,
  broadcast,
  emitToRoom,
  emitToPlayer,
};