/**
 * Scheduler para el proceso de matchmaking
 */

const { matchmakingService } = require('../services');
const { GameMode } = require('../domain');
const config = require('../config');
const logger = require('../config/logger');

class MatchmakingScheduler {
  constructor() {
    this.matchingInterval = null;
    this.statsInterval = null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      logger.warn('Scheduler: Ya está en ejecución');
      return;
    }

    this.isRunning = true;

    this.matchingInterval = setInterval(
      () => this.executeMatching(),
      config.matchmaking.schedulerInterval
    );

    this.statsInterval = setInterval(
      () => this.logMatchmakingStats(),
      config.matchmaking.statsLogInterval
    );

    logger.info(
      `Scheduler iniciado - Matching cada ${config.matchmaking.schedulerInterval}ms`
    );
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    if (this.matchingInterval) {
      clearInterval(this.matchingInterval);
      this.matchingInterval = null;
    }

    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    this.isRunning = false;
    logger.info('Scheduler detenido');
  }

  async executeMatching() {
    try {
      await matchmakingService.performMatching(GameMode.PVP);
      await matchmakingService.performMatching(GameMode.BOSS);
    } catch (error) {
      logger.error('Error durante el proceso de matching', {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  async logMatchmakingStats() {
    try {
      const stats = await matchmakingService.getStats();
      logger.info('📊 Estadísticas de Matchmaking', {
        pvpQueue: stats.pvpQueueSize,
        bossQueue: stats.bossQueueSize,
        totalRooms: stats.totalRooms,
      });
    } catch (error) {
      logger.error('Error al obtener estadísticas', {
        error: error.message,
      });
    }
  }

  isSchedulerRunning() {
    return this.isRunning;
  }
}

module.exports = new MatchmakingScheduler();