/**
 * Exportaciones del módulo de repositorios
 */

const redisQueueRepository = require('./RedisQueueRepository');
const redisRoomRepository = require('./RedisRoomRepository');

module.exports = {
  redisQueueRepository,
  redisRoomRepository,
};