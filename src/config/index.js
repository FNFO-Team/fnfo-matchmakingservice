/**
 * Configuración centralizada del microservicio de Matchmaking
 * Equivalente a application.yml en Spring Boot
 */

require('dotenv').config();

const config = {
  // Configuración del servidor
  server: {
    port: parseInt(process.env.PORT, 10) || 8082,
    env: process.env.NODE_ENV || 'development',
    apiPrefix: process.env.API_PREFIX || '/api',
  },

  // Configuración de Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    timeout: parseInt(process.env.REDIS_TIMEOUT, 10) || 2000,
    retryDelayMs: 1000,
    maxRetries: 10,
    pool: {
      max: parseInt(process.env.REDIS_POOL_MAX, 10) || 10,
      min: parseInt(process.env.REDIS_POOL_MIN, 10) || 2,
    },
  },

  // Configuración de matchmaking
  matchmaking: {
    schedulerInterval: parseInt(process.env.MATCHMAKING_INTERVAL, 10) || 1500,
    statsLogInterval: parseInt(process.env.STATS_LOG_INTERVAL, 10) || 10000,
    queueExpiryMinutes: parseInt(process.env.QUEUE_EXPIRY_MINUTES, 10) || 30,
    roomExpiryHours: parseInt(process.env.ROOM_EXPIRY_HOURS, 10) || 2,
    maxPlayersPvp: parseInt(process.env.MAX_PLAYERS_PVP, 10) || 2,
    maxPlayersBoss: parseInt(process.env.MAX_PLAYERS_BOSS, 10) || 4,
    minPlayersForRoom: parseInt(process.env.MIN_PLAYERS_FOR_ROOM, 10) || 2,
  },

  // Configuración de rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutos
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    matchmakingWindowMs: parseInt(process.env.MATCHMAKING_RATE_WINDOW_MS, 10) || 60 * 1000, // 1 minuto
    matchmakingMaxRequests: parseInt(process.env.MATCHMAKING_RATE_MAX_REQUESTS, 10) || 10,
  },

  // Configuración de logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
  },

  // Canales de Redis Pub/Sub
  channels: {
    roomNotifications: 'room.notifications',
    matchmakingEvents: 'matchmaking.events',
  },

  // Prefijos de claves Redis
  keys: {
    queuePrefix: 'matchmaking:queue:',
    roomPrefix: 'room:',
    roomIndex: 'rooms:index',
    playerRoom: 'player:room:',
  },
};

module.exports = config;