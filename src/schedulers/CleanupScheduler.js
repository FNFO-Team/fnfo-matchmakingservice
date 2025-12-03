/**
 * Scheduler para limpieza de datos expirados
 * Limpia colas y salas que han expirado
 */

const { matchmakingService, roomService } = require('../services');
const { redisQueueRepository, redisRoomRepository } = require('../repositories');
const { GameMode, RoomStatus } = require('../domain');
const config = require('../config');
const logger = require('../config/logger');

class CleanupScheduler {
  constructor() {
    this.cleanupInterval = null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      logger.warn('CleanupScheduler: Ya está en ejecución');
      return;
    }

    this.isRunning = true;

    // Ejecutar cada 5 minutos
    const intervalMs = 5 * 60 * 1000;

    this.cleanupInterval = setInterval(
      () => this.executeCleanup(),
      intervalMs
    );

    logger.info(`CleanupScheduler iniciado - Limpieza cada ${intervalMs / 1000}s`);
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.isRunning = false;
    logger.info('CleanupScheduler detenido');
  }

  async executeCleanup() {
    try {
      logger.info('🧹 Iniciando limpieza de datos expirados...');

      const stats = {
        expiredQueuePlayers: 0,
        expiredRooms: 0,
        abandonedRooms: 0,
      };

      // 1. Limpiar jugadores que llevan mucho tiempo en cola
      stats.expiredQueuePlayers += await this.cleanExpiredQueuePlayers(GameMode.PVP);
      stats.expiredQueuePlayers += await this.cleanExpiredQueuePlayers(GameMode.BOSS);

      // 2. Limpiar salas antiguas/abandonadas
      const roomStats = await this.cleanExpiredRooms();
      stats.expiredRooms = roomStats.expiredRooms;
      stats.abandonedRooms = roomStats.abandonedRooms;

      logger.info('✅ Limpieza completada', stats);
    } catch (error) {
      logger.error('Error durante limpieza', {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Limpia jugadores que llevan demasiado tiempo en cola
   */
  async cleanExpiredQueuePlayers(gameMode) {
    try {
      const maxWaitTimeMs = config.matchmaking.queueExpiryMinutes * 60 * 1000;
      const players = await redisQueueRepository.getPlayersFromQueue(gameMode, 1000);
      
      let removedCount = 0;
      const now = Date.now();

      for (const player of players) {
        const waitTime = now - player.joinedAt;
        
        if (waitTime > maxWaitTimeMs) {
          await redisQueueRepository.removePlayerFromQueue(player.playerId, gameMode);
          removedCount++;
          logger.info(`Jugador ${player.playerId} removido de cola ${gameMode.name} por timeout`, {
            waitTimeMinutes: Math.floor(waitTime / 60000),
          });
        }
      }

      if (removedCount > 0) {
        logger.info(`Removidos ${removedCount} jugadores expirados de cola ${gameMode.name}`);
      }

      return removedCount;
    } catch (error) {
      logger.error(`Error limpiando cola ${gameMode.name}`, {
        error: error.message,
      });
      return 0;
    }
  }

  /**
   * Limpia salas antiguas o abandonadas
   */
  async cleanExpiredRooms() {
    try {
      const rooms = await roomService.getAllRooms();
      const now = Date.now();
      
      const maxRoomAgeMs = config.matchmaking.roomExpiryHours * 60 * 60 * 1000;
      const abandonedThresholdMs = 30 * 60 * 1000; // 30 minutos en FORMING sin cambios
      
      let expiredCount = 0;
      let abandonedCount = 0;

      for (const room of rooms) {
        const roomAge = now - room.createdAt;
        let shouldDelete = false;
        let reason = '';

        // Caso 1: Sala FINISHED antigua
        if (room.status === RoomStatus.FINISHED.name && roomAge > maxRoomAgeMs) {
          shouldDelete = true;
          reason = 'sala finalizada antigua';
          expiredCount++;
        }

        // Caso 2: Sala FORMING abandonada (más de 30 minutos sin jugadores suficientes)
        if (
          room.status === RoomStatus.FORMING.name &&
          roomAge > abandonedThresholdMs &&
          room.currentPlayers < config.matchmaking.minPlayersForRoom
        ) {
          shouldDelete = true;
          reason = 'sala abandonada sin jugadores suficientes';
          abandonedCount++;
        }

        // Caso 3: Sala READY antigua que nunca inició (más de 2 horas)
        if (room.status === RoomStatus.READY.name && roomAge > maxRoomAgeMs) {
          shouldDelete = true;
          reason = 'sala lista pero nunca inició';
          expiredCount++;
        }

        // Caso 4: Sala vacía
        if (room.currentPlayers === 0) {
          shouldDelete = true;
          reason = 'sala vacía';
          abandonedCount++;
        }

        if (shouldDelete) {
          await roomService.deleteRoom(room.roomId);
          logger.info(`Sala ${room.roomId} eliminada: ${reason}`, {
            status: room.status,
            ageMinutes: Math.floor(roomAge / 60000),
            players: room.currentPlayers,
          });
        }
      }

      return {
        expiredRooms: expiredCount,
        abandonedRooms: abandonedCount,
      };
    } catch (error) {
      logger.error('Error limpiando salas', {
        error: error.message,
      });
      return {
        expiredRooms: 0,
        abandonedRooms: 0,
      };
    }
  }

  /**
   * Ejecuta limpieza inmediata (útil para testing)
   */
  async forceCleanup() {
    await this.executeCleanup();
  }

  isSchedulerRunning() {
    return this.isRunning;
  }
}

module.exports = new CleanupScheduler();
