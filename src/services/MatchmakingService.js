/**
 * Servicio principal de Matchmaking
 */

const { redisQueueRepository } = require('../repositories');
const roomService = require('./RoomService');
const { getRedisClient } = require('../config/redis');
const { Player, GameMode } = require('../domain');
const { MatchmakingResponse, RoomNotificationEvent } = require('../dto');
const { MatchmakingException, PlayerAlreadyInQueueException } = require('../exceptions');
const config = require('../config');
const logger = require('../config/logger');

class MatchmakingService {
  constructor() {
    this.queueRepository = redisQueueRepository;
    this.roomService = roomService;
    this.roomNotificationChannel = config.channels.roomNotifications;
  }

  async joinMatchmaking(playerId, gameMode) {
    if (!playerId || playerId.trim() === '') {
      throw new MatchmakingException('El ID del jugador no puede estar vacío');
    }

    const isInQueue = await this.queueRepository.isPlayerInQueue(playerId, gameMode);
    if (isInQueue) {
      throw new PlayerAlreadyInQueueException(playerId);
    }

    const existingRoom = await this.roomService.getPlayerRoom(playerId);
    if (existingRoom) {
      throw new MatchmakingException(
        `El jugador ${playerId} ya está en la sala ${existingRoom.roomId}`
      );
    }

    const player = Player.of(playerId, gameMode);
    await this.queueRepository.addPlayerToQueue(player, gameMode);

    const queueSize = await this.queueRepository.getQueueSize(gameMode);
    logger.info(`Jugador ${playerId} unido a cola ${gameMode.name}. Tamaño: ${queueSize}`);

    return MatchmakingResponse.success(
      `Te has unido a la cola de ${gameMode.description}`,
      queueSize,
      queueSize
    );
  }

  async leaveMatchmaking(playerId, gameMode) {
    const removed = await this.queueRepository.removePlayerFromQueue(playerId, gameMode);
    if (removed) {
      logger.info(`Jugador ${playerId} removido de cola ${gameMode.name}`);
    }
    return removed;
  }

  async performMatching(gameMode) {
    let queueSize = await this.queueRepository.getQueueSize(gameMode);
    
    const minPlayersForRoom = config.matchmaking.minPlayersForRoom;
    const maxPlayersForRoom = gameMode.name === 'PVP'
      ? config.matchmaking.maxPlayersPvp
      : config.matchmaking.maxPlayersBoss;

    if (queueSize < minPlayersForRoom) {
      logger.debug(`No hay suficientes jugadores en cola ${gameMode.name} (${queueSize})`);
      return;
    }

    while (queueSize >= minPlayersForRoom) {
      const playersForThisRoom = Math.min(queueSize, maxPlayersForRoom);
      const room = await this.roomService.createRoom(gameMode);
      const addedPlayers = [];

      for (let i = 0; i < playersForThisRoom; i++) {
        const player = await this.queueRepository.popPlayerFromQueue(gameMode);
        if (player) {
          await this.roomService.addPlayerToRoom(room.roomId, player.playerId);
          addedPlayers.push(player.playerId);
        }
      }

      if (addedPlayers.length > 0) {
        const updatedRoom = await this.roomService.getRoomById(room.roomId);
        updatedRoom.setReady();
        await this.publishRoomNotification(updatedRoom);
        logger.info(
          `Sala ${room.roomId} creada con ${addedPlayers.length} jugadores en modo ${gameMode.name}`
        );
      }

      queueSize = await this.queueRepository.getQueueSize(gameMode);
    }
  }

  async publishRoomNotification(room) {
    try {
      const event = RoomNotificationEvent.fromRoom(room);
      const client = getRedisClient();
      await client.publish(
        this.roomNotificationChannel,
        JSON.stringify(event.toJSON())
      );
      logger.debug(`Evento de notificación publicado para sala ${room.roomId}`);
    } catch (error) {
      logger.error('Error al publicar notificación de sala', {
        roomId: room.roomId,
        error: error.message,
      });
    }
  }

  async getQueueSize(gameMode) {
    return await this.queueRepository.getQueueSize(gameMode);
  }

  async getStats() {
    const pvpQueueSize = await this.getQueueSize(GameMode.PVP);
    const bossQueueSize = await this.getQueueSize(GameMode.BOSS);
    const totalRooms = await this.roomService.getTotalRooms();

    return {
      pvpQueueSize,
      bossQueueSize,
      totalRooms,
      timestamp: Date.now(),
    };
  }

  async getPlayerQueuePosition(playerId, gameMode) {
    const players = await this.queueRepository.getPlayersFromQueue(gameMode, 1000);
    for (let i = 0; i < players.length; i++) {
      if (players[i].playerId === playerId) {
        return i + 1;
      }
    }
    return null;
  }

  async getPlayerStatus(playerId) {
    const room = await this.roomService.getPlayerRoom(playerId);
    if (room) {
      return {
        status: 'IN_ROOM',
        roomId: room.roomId,
        roomStatus: room.status,
        players: room.players,
        mode: room.mode,
      };
    }

    const pvpPosition = await this.getPlayerQueuePosition(playerId, GameMode.PVP);
    if (pvpPosition) {
      return {
        status: 'IN_QUEUE',
        mode: 'PVP',
        position: pvpPosition,
        queueSize: await this.getQueueSize(GameMode.PVP),
      };
    }

    const bossPosition = await this.getPlayerQueuePosition(playerId, GameMode.BOSS);
    if (bossPosition) {
      return {
        status: 'IN_QUEUE',
        mode: 'BOSS',
        position: bossPosition,
        queueSize: await this.getQueueSize(GameMode.BOSS),
      };
    }

    return {
      status: 'NOT_IN_MATCHMAKING',
    };
  }
}

module.exports = new MatchmakingService();