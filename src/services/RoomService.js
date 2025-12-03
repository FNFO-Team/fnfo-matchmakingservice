/**
 * Servicio para gestión de salas de juego
 */

const { redisRoomRepository } = require('../repositories');
const { GameRoom, GameMode, RoomStatus } = require('../domain');
const { RoomNotFoundException, RoomFullException } = require('../exceptions');
const config = require('../config');
const logger = require('../config/logger');

class RoomService {
  constructor() {
    this.roomRepository = redisRoomRepository;
  }

  getMaxPlayersForMode(gameMode) {
    return gameMode.name === 'PVP'
      ? config.matchmaking.maxPlayersPvp
      : config.matchmaking.maxPlayersBoss;
  }

  async createRoom(gameMode) {
    const roomId = GameRoom.generateRoomId();
    const maxPlayers = this.getMaxPlayersForMode(gameMode);
    const room = GameRoom.create(roomId, gameMode, maxPlayers);
    await this.roomRepository.saveRoom(room);
    logger.info(`Sala creada: ${roomId} en modo ${gameMode.name}`);
    return room;
  }

  async getRoomById(roomId) {
    const room = await this.roomRepository.findRoomById(roomId);
    if (!room) {
      throw new RoomNotFoundException(roomId);
    }
    return room;
  }

  async addPlayerToRoom(roomId, playerId) {
    const room = await this.getRoomById(roomId);
    if (!room.canAcceptPlayer()) {
      throw new RoomFullException(roomId);
    }
    
    const added = room.addPlayer(playerId);
    if (!added) {
      return false;
    }
    
    if (room.isFull() || room.currentPlayers >= config.matchmaking.minPlayersForRoom) {
      room.setReady();
    }
    
    await this.roomRepository.saveRoom(room);
    logger.debug(`Jugador ${playerId} agregado a sala ${roomId}`);
    return true;
  }

  async removePlayerFromRoom(roomId, playerId) {
    try {
      const room = await this.getRoomById(roomId);
      const removed = room.removePlayer(playerId);
      
      if (!removed) {
        return false;
      }
      
      if (room.currentPlayers === 0) {
        await this.roomRepository.deleteRoom(roomId);
        logger.info(`Sala ${roomId} eliminada por estar vacía`);
      } else {
        if (room.currentPlayers < config.matchmaking.minPlayersForRoom) {
          room.status = RoomStatus.FORMING.name;
        }
        await this.roomRepository.saveRoom(room);
      }
      
      logger.debug(`Jugador ${playerId} removido de sala ${roomId}`);
      return true;
    } catch (error) {
      if (error instanceof RoomNotFoundException) {
        return false;
      }
      throw error;
    }
  }

  async markRoomAsInProgress(roomId) {
    await this.roomRepository.updateRoomStatus(roomId, RoomStatus.IN_PROGRESS.name);
    logger.info(`Sala ${roomId} marcada como en progreso`);
  }

  async markRoomAsFinished(roomId) {
    await this.roomRepository.updateRoomStatus(roomId, RoomStatus.FINISHED.name);
    logger.info(`Sala ${roomId} marcada como finalizada`);
  }

  async isRoomReady(roomId) {
    const room = await this.getRoomById(roomId);
    return room.isReady();
  }

  async getAllRooms() {
    return await this.roomRepository.getAllRooms();
  }

  async getRoomsByMode(mode) {
    return await this.roomRepository.getRoomsByMode(mode);
  }

  async getRoomsByStatus(status) {
    return await this.roomRepository.getRoomsByStatus(status);
  }

  async getPlayerRoom(playerId) {
    const roomId = await this.roomRepository.getPlayerRoom(playerId);
    if (!roomId) {
      return null;
    }
    return await this.roomRepository.findRoomById(roomId);
  }

  async getTotalRooms() {
    return await this.roomRepository.getTotalRooms();
  }

  async deleteRoom(roomId) {
    await this.roomRepository.deleteRoom(roomId);
    logger.info(`Sala ${roomId} eliminada`);
  }
}

module.exports = new RoomService();