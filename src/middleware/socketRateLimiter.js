/**
 * Rate Limiter para eventos de Socket.IO
 * Previene spam de eventos WebSocket
 */

const logger = require('../config/logger');

class SocketRateLimiter {
  constructor() {
    // Map de playerId -> Map de eventName -> timestamps[]
    this.eventLog = new Map();
    this.cleanupInterval = null;
  }

  /**
   * Inicia limpieza periódica de logs antiguos
   */
  startCleanup() {
    // Limpiar cada 5 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Detiene limpieza periódica
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Limpia logs antiguos (más de 10 minutos)
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutos

    for (const [playerId, events] of this.eventLog.entries()) {
      for (const [eventName, timestamps] of events.entries()) {
        // Filtrar timestamps antiguos
        const recent = timestamps.filter((ts) => now - ts < maxAge);
        
        if (recent.length === 0) {
          events.delete(eventName);
        } else {
          events.set(eventName, recent);
        }
      }

      // Si el jugador no tiene eventos recientes, eliminarlo
      if (events.size === 0) {
        this.eventLog.delete(playerId);
      }
    }

    logger.debug(`Limpieza de rate limiter: ${this.eventLog.size} jugadores activos`);
  }

  /**
   * Verifica si un evento está permitido
   * @param {string} playerId - ID del jugador
   * @param {string} eventName - Nombre del evento
   * @param {number} maxEvents - Máximo de eventos permitidos
   * @param {number} windowMs - Ventana de tiempo en ms
   * @returns {boolean} - true si está permitido
   */
  checkLimit(playerId, eventName, maxEvents = 10, windowMs = 60000) {
    const now = Date.now();

    // Obtener o crear registro del jugador
    if (!this.eventLog.has(playerId)) {
      this.eventLog.set(playerId, new Map());
    }

    const playerEvents = this.eventLog.get(playerId);

    // Obtener o crear registro del evento
    if (!playerEvents.has(eventName)) {
      playerEvents.set(eventName, []);
    }

    const timestamps = playerEvents.get(eventName);

    // Filtrar timestamps dentro de la ventana
    const recentTimestamps = timestamps.filter((ts) => now - ts < windowMs);

    // Verificar si excede el límite
    if (recentTimestamps.length >= maxEvents) {
      logger.warn('Socket rate limit excedido', {
        playerId,
        eventName,
        attempts: recentTimestamps.length,
        maxEvents,
        windowMs,
      });
      return false;
    }

    // Agregar timestamp actual
    recentTimestamps.push(now);
    playerEvents.set(eventName, recentTimestamps);

    return true;
  }

  /**
   * Resetea los límites de un jugador
   * @param {string} playerId
   */
  reset(playerId) {
    this.eventLog.delete(playerId);
  }

  /**
   * Obtiene estadísticas de rate limiting
   */
  getStats() {
    return {
      activePlayers: this.eventLog.size,
      totalEvents: Array.from(this.eventLog.values()).reduce(
        (sum, events) => sum + events.size,
        0
      ),
    };
  }
}

/**
 * Middleware para Socket.IO
 * Verifica rate limits antes de procesar eventos
 */
const createSocketRateLimitMiddleware = (limiter) => {
  return (eventName, maxEvents, windowMs) => {
    return (socket, next) => {
      const playerId = socket.playerId;

      if (!playerId) {
        return next();
      }

      const allowed = limiter.checkLimit(playerId, eventName, maxEvents, windowMs);

      if (!allowed) {
        socket.emit('rate-limit-error', {
          error: 'SOCKET_RATE_LIMIT',
          message: `Estás enviando eventos "${eventName}" demasiado rápido. Por favor espera.`,
          eventName,
        });
        return next(new Error('Rate limit excedido'));
      }

      next();
    };
  };
};

// Instancia singleton
const socketRateLimiter = new SocketRateLimiter();
socketRateLimiter.startCleanup();

module.exports = {
  socketRateLimiter,
  createSocketRateLimitMiddleware,
};
