/**
 * Repositorio para operaciones de salas en Redis
 */

const { getRedisClient } = require('../config/redis');
const config = require('../config');
const logger = require('../config/logger');
const GameRoom = require('../domain/GameRoom');

class RedisRoomRepository {
  constructor() {
    this.roomPrefix = config.keys.roomPrefix;
    this.roomIndexKey = config.keys.roomIndex;
    this.playerRoomPrefix = config.keys.playerRoom;
    this.roomExpirySeconds = config.matchmaking.roomExpiryHours * 60 * 60;
  }

  getClient() {
    return getRedisClient();
  }

  getRoomKey(roomId) {
    return `${this.roomPrefix}${roomId}`;
  }

  getPlayerRoomKey(playerId) {
    return `${this.playerRoomPrefix}${playerId}`;
  }

  async saveRoom(room) {
    const key = this.getRoomKey(room.roomId);
    const client = this.getClient();
    
    try {
      const roomJson = JSON.stringify(room.toJSON());
      await client.setex(key, this.roomExpirySeconds, roomJson);
      await client.sadd(this.roomIndexKey, room.roomId);
      await client.expire(this.roomIndexKey, this.roomExpirySeconds);
      
      for (const playerId of room.players) {
        await client.setex(
          this.getPlayerRoomKey(playerId),
          this.roomExpirySeconds,
          room.roomId
        );
      }
      logger.debug(`Sala ${room.roomId} guardada`);
    } catch (error) {
      logger.error('Error al guardar sala', {
        roomId: room.roomId,
        error: error.message,
      });
      throw error;
    }
  }

  async findRoomById(roomId) {
    const key = this.getRoomKey(roomId);
    const client = this.getClient();
    
    try {
      const roomJson = await client.get(key);
      if (!roomJson) {
        return null;
      }
      return GameRoom.fromJSON(roomJson);
    } catch (error) {
      logger.error('Error al recuperar sala', {
        roomId,
        error: error.message,
      });
      throw error;
    }
  }

  async roomExists(roomId) {
    const key = this.getRoomKey(roomId);
    const client = this.getClient();
    
    try {
      const exists = await client.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error('Error al verificar existencia de sala', {
        roomId,
        error: error.message,
      });
      return false;
    }
  }

  async deleteRoom(roomId) {
    const key = this.getRoomKey(roomId);
    const client = this.getClient();
    
    try {
      const room = await this.findRoomById(roomId);
      if (room) {
        for (const playerId of room.players) {
          await client.del(this.getPlayerRoomKey(playerId));
        }
      }
      await client.del(key);
      await client.srem(this.roomIndexKey, roomId);
      logger.debug(`Sala ${roomId} eliminada`);
    } catch (error) {
      logger.error('Error al eliminar sala', {
        roomId,
        error: error.message,
      });
      throw error;
    }
  }

  async updateRoomStatus(roomId, status) {
    try {
      const room = await this.findRoomById(roomId);
      if (room) {
        room.status = status;
        await this.saveRoom(room);
        logger.debug(`Sala ${roomId} actualizada a estado ${status}`);
      }
    } catch (error) {
      logger.error('Error al actualizar estado de sala', {
        roomId,
        status,
        error: error.message,
      });
      throw error;
    }
  }

  async getTotalRooms() {
    const client = this.getClient();
    try {
      const count = await client.scard(this.roomIndexKey);
      return count || 0;
    } catch (error) {
      logger.error('Error al obtener total de salas', {
        error: error.message,
      });
      return 0;
    }
  }

  async getAllRooms() {
    const client = this.getClient();
    try {
      const roomIds = await client.smembers(this.roomIndexKey);
      const rooms = [];
      for (const roomId of roomIds) {
        const room = await this.findRoomById(roomId);
        if (room) {
          rooms.push(room);
        }
      }
      return rooms;
    } catch (error) {
      logger.error('Error al obtener todas las salas', {
        error: error.message,
      });
      return [];
    }
  }

  async getPlayerRoom(playerId) {
    const key = this.getPlayerRoomKey(playerId);
    const client = this.getClient();
    try {
      return await client.get(key);
    } catch (error) {
      logger.error('Error al obtener sala de jugador', {
        playerId,
        error: error.message,
      });
      return null;
    }
  }

  async getRoomsByMode(mode) {
    try {
      const allRooms = await this.getAllRooms();
      return allRooms.filter((room) => room.mode === mode);
    } catch (error) {
      logger.error('Error al obtener salas por modo', {
        mode,
        error: error.message,
      });
      return [];
    }
  }

  async getRoomsByStatus(status) {
    try {
      const allRooms = await this.getAllRooms();
      return allRooms.filter((room) => room.status === status);
    } catch (error) {
      logger.error('Error al obtener salas por estado', {
        status,
        error: error.message,
      });
      return [];
    }
  }
}

module.exports = new RedisRoomRepository();