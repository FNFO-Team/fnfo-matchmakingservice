/**
 * Configuración y conexión de Redis
 */

const Redis = require('ioredis');
const logger = require('./logger');

let redisClient = null;
let redisSubscriber = null;

/**
 * Obtiene las opciones de conexión Redis
 */
const getRedisOptions = () => {
  const redisUrl = process.env.REDIS_URL;
  
  if (redisUrl) {
    // Si hay REDIS_URL (Azure, producción)
    return {
      // ioredis parsea la URL automáticamente
      tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
      retryStrategy: (times) => {
        if (times > 10) {
          logger.error('Redis: máximo de reintentos alcanzado');
          return null;
        }
        const delay = Math.min(times * 2000, 5000);
        logger.warn(`Redis: reintentando en ${delay}ms (intento ${times})`);
        return delay;
      },
    };
  }
  
  // Configuración local
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    retryStrategy: (times) => {
      if (times > 10) {
        logger.error('Redis: máximo de reintentos alcanzado');
        return null;
      }
      const delay = Math.min(times * 2000, 5000);
      logger.warn(`Redis: reintentando en ${delay}ms (intento ${times})`);
      return delay;
    },
  };
};

/**
 * Cliente Redis para comandos normales
 */
const createRedisClient = () => {
  const redisUrl = process.env.REDIS_URL;
  const options = getRedisOptions();
  
  let client;
  if (redisUrl) {
    client = new Redis(redisUrl, options);
  } else {
    client = new Redis(options);
  }

  client.on('connect', () => logger.info('Redis(Client): conexión establecida'));
  client.on('ready', () => logger.info('Redis(Client): listo'));
  client.on('error', (err) => logger.error('Redis(Client): error', { error: err.message }));
  client.on('close', () => logger.warn('Redis(Client): conexión cerrada'));

  return client;
};

/**
 * Cliente Redis SOLO para Pub/Sub (debe ser una conexión separada)
 */
const createRedisSubscriber = () => {
  const redisUrl = process.env.REDIS_URL;
  const options = getRedisOptions();
  
  let subscriber;
  if (redisUrl) {
    // Crear una nueva conexión independiente para Pub/Sub
    subscriber = new Redis(redisUrl, {
      ...options,
      // Asegurar que es una conexión nueva
      lazyConnect: false,
    });
  } else {
    subscriber = new Redis({
      ...options,
      lazyConnect: false,
    });
  }

  subscriber.on('connect', () => logger.info('Redis(Subscriber): conexión establecida'));
  subscriber.on('ready', () => logger.info('Redis(Subscriber): listo'));
  subscriber.on('error', (err) => logger.error('Redis(Subscriber): error', { error: err.message }));
  subscriber.on('close', () => logger.warn('Redis(Subscriber): conexión cerrada'));

  return subscriber;
};

/**
 * Singleton cliente principal - para comandos GET, SET, etc.
 */
const getRedisClient = () => {
  if (!redisClient) {
    logger.info('Creando cliente Redis principal...');
    redisClient = createRedisClient();
  }
  return redisClient;
};

/**
 * Singleton cliente Pub/Sub - SOLO para subscribe/publish
 */
const getRedisSubscriber = () => {
  if (!redisSubscriber) {
    logger.info('Creando cliente Redis Subscriber...');
    redisSubscriber = createRedisSubscriber();
  }
  return redisSubscriber;
};

/**
 * Cierre limpio
 */
const closeConnections = async () => {
  const tasks = [];

  if (redisClient) {
    tasks.push(redisClient.quit());
    redisClient = null;
  }

  if (redisSubscriber) {
    tasks.push(redisSubscriber.quit());
    redisSubscriber = null;
  }

  await Promise.all(tasks);
  logger.info('Redis: conexiones cerradas');
};

/**
 * Health check - usa el cliente principal, NO el subscriber
 */
const healthCheck = async () => {
  try {
    const client = getRedisClient();
    const pong = await client.ping();
    return pong === 'PONG';
  } catch (err) {
    logger.error('Redis: health check fallido', { error: err.message });
    return false;
  }
};

module.exports = {
  getRedisClient,
  getRedisSubscriber,
  closeConnections,
  healthCheck,
};