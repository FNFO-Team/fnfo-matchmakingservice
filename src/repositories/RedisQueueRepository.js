/**
 * Repositorio para operaciones de cola en Redis
 */

const { getRedisClient } = require('../config/redis');
const config = require('../config');
const logger = require('../config/logger');
const Player = require('../domain/Player');

class RedisQueueRepository {
  constructor() {
    this.queuePrefix = config.keys.queuePrefix;
    this.queueExpirySeconds = config.matchmaking.queueExpiryMinutes * 60;
  }

  getClient() {
    return getRedisClient();
  }

  getQueueKey(gameMode) {
    return `${this.queuePrefix}${gameMode.name}`;
  }

  async addPlayerToQueue(player, gameMode) {
    const key = this.getQueueKey(gameMode);
    const client = this.getClient();
    
    try {
      const playerJson = JSON.stringify(player.toJSON());
      await client.rpush(key, playerJson);
      await client.expire(key, this.queueExpirySeconds);
      logger.debug(`Jugador ${player.playerId} agregado a cola ${gameMode.name}`);
    } catch (error) {
      logger.error('Error al agregar jugador a cola', {
        playerId: player.playerId,
        mode: gameMode.name,
        error: error.message,
      });
      throw error;
    }
  }

  async popPlayerFromQueue(gameMode) {
    const key = this.getQueueKey(gameMode);
    const client = this.getClient();
    
    try {
      const playerJson = await client.lpop(key);
      if (!playerJson) {
        return null;
      }
      return Player.fromJSON(playerJson);
    } catch (error) {
      logger.error('Error al obtener jugador de cola', {
        mode: gameMode.name,
        error: error.message,
      });
      throw error;
    }
  }

  async getPlayersFromQueue(gameMode, count) {
    const key = this.getQueueKey(gameMode);
    const client = this.getClient();
    
    try {
      const playersJson = await client.lrange(key, 0, count - 1);
      return playersJson.map((json) => Player.fromJSON(json));
    } catch (error) {
      logger.error('Error al obtener jugadores de cola', {
        mode: gameMode.name,
        error: error.message,
      });
      throw error;
    }
  }

  async getQueueSize(gameMode) {
    const key = this.getQueueKey(gameMode);
    const client = this.getClient();
    
    try {
      const size = await client.llen(key);
      return size || 0;
    } catch (error) {
      logger.error('Error al obtener tamaño de cola', {
        mode: gameMode.name,
        error: error.message,
      });
      return 0;
    }
  }

  async removePlayersFromQueue(gameMode, count) {
    const key = this.getQueueKey(gameMode);
    const client = this.getClient();
    
    try {
      for (let i = 0; i < count; i++) {
        await client.lpop(key);
      }
      logger.debug(`${count} jugadores removidos de cola ${gameMode.name}`);
    } catch (error) {
      logger.error('Error al remover jugadores de cola', {
        mode: gameMode.name,
        count,
        error: error.message,
      });
      throw error;
    }
  }

  async isPlayerInQueue(playerId, gameMode) {
    const key = this.getQueueKey(gameMode);
    const client = this.getClient();
    
    try {
      const players = await client.lrange(key, 0, -1);
      return players.some((json) => {
        const player = Player.fromJSON(json);
        return player.playerId === playerId;
      });
    } catch (error) {
      logger.error('Error al verificar jugador en cola', {
        playerId,
        mode: gameMode.name,
        error: error.message,
      });
      return false;
    }
  }

  async removePlayerFromQueue(playerId, gameMode) {
    const key = this.getQueueKey(gameMode);
    const client = this.getClient();
    
    try {
      const players = await client.lrange(key, 0, -1);
      for (let i = 0; i < players.length; i++) {
        const player = Player.fromJSON(players[i]);
        if (player.playerId === playerId) {
          await client.lrem(key, 1, players[i]);
          logger.debug(`Jugador ${playerId} removido de cola ${gameMode.name}`);
          return true;
        }
      }
      return false;
    } catch (error) {
      logger.error('Error al remover jugador específico de cola', {
        playerId,
        mode: gameMode.name,
        error: error.message,
      });
      return false;
    }
  }

  async clearQueue(gameMode) {
    const key = this.getQueueKey(gameMode);
    const client = this.getClient();
    
    try {
      await client.del(key);
      logger.info(`Cola ${gameMode.name} limpiada`);
    } catch (error) {
      logger.error('Error al limpiar cola', {
        mode: gameMode.name,
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = new RedisQueueRepository();