/**
 * Configuración y conexión de Redis
 * Equivalente a RedisConfig.java
 */

const Redis = require('ioredis');
const config = require('./index');
const logger = require('./logger');

let redisClient = null;
let redisSubscriber = null;

/**
 * Crea y configura el cliente Redis principal
 */
const createRedisClient = () => {
  const client = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
    db: config.redis.db,
    connectTimeout: config.redis.timeout,
    retryStrategy: (times) => {
      if (times > config.redis.maxRetries) {
        logger.error('Redis: Máximo de reintentos alcanzado');
        return null;
      }
      const delay = Math.min(times * config.redis.retryDelayMs, 5000);
      logger.warn(`Redis: Reintentando conexión en ${delay}ms (intento ${times})`);
      return delay;
    },
    lazyConnect: false,
  });

  client.on('connect', () => {
    logger.info('Redis: Conexión establecida');
  });

  client.on('ready', () => {
    logger.info('Redis: Cliente listo para recibir comandos');
  });

  client.on('error', (err) => {
    logger.error('Redis: Error de conexión', { error: err.message });
  });

  client.on('close', () => {
    logger.warn('Redis: Conexión cerrada');
  });

  client.on('reconnecting', () => {
    logger.info('Redis: Reconectando...');
  });

  return client;
};

/**
 * Obtiene el cliente Redis principal (singleton)
 */
const getRedisClient = () => {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
};

/**
 * Crea un cliente Redis dedicado para suscripciones Pub/Sub
 */
const getRedisSubscriber = () => {
  if (!redisSubscriber) {
    redisSubscriber = createRedisClient();
    logger.info('Redis: Cliente de suscripción creado');
  }
  return redisSubscriber;
};

/**
 * Cierra todas las conexiones Redis
 */
const closeConnections = async () => {
  const promises = [];
  
  if (redisClient) {
    promises.push(redisClient.quit());
    redisClient = null;
  }
  
  if (redisSubscriber) {
    promises.push(redisSubscriber.quit());
    redisSubscriber = null;
  }
  
  await Promise.all(promises);
  logger.info('Redis: Todas las conexiones cerradas');
};

/**
 * Verifica el estado de la conexión Redis
 */
const healthCheck = async () => {
  try {
    const client = getRedisClient();
    const result = await client.ping();
    return result === 'PONG';
  } catch (error) {
    logger.error('Redis: Health check fallido', { error: error.message });
    return false;
  }
};

module.exports = {
  getRedisClient,
  getRedisSubscriber,
  closeConnections,
  healthCheck,
};