/**
 * Controlador de Health Check
 */

const express = require('express');
const { healthCheck: redisHealthCheck } = require('../config/redis');
const matchmakingScheduler = require('../schedulers/MatchmakingScheduler');
const { matchmakingService } = require('../services');
const { asyncHandler } = require('../middleware');

const router = express.Router();

// GET /health
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const redisOk = await redisHealthCheck();
    const schedulerOk = matchmakingScheduler.isSchedulerRunning();
    
    const status = redisOk && schedulerOk ? 'UP' : 'DOWN';
    const httpStatus = status === 'UP' ? 200 : 503;
    
    res.status(httpStatus).json({
      status,
      timestamp: new Date().toISOString(),
      components: {
        redis: { status: redisOk ? 'UP' : 'DOWN' },
        scheduler: { status: schedulerOk ? 'UP' : 'DOWN' },
      },
    });
  })
);

// GET /health/live
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
  });
});

// GET /health/ready
router.get(
  '/ready',
  asyncHandler(async (req, res) => {
    const redisOk = await redisHealthCheck();
    
    if (!redisOk) {
      return res.status(503).json({
        status: 'DOWN',
        reason: 'Redis no disponible',
        timestamp: new Date().toISOString(),
      });
    }
    
    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
    });
  })
);

// GET /health/detailed
router.get(
  '/detailed',
  asyncHandler(async (req, res) => {
    const redisOk = await redisHealthCheck();
    const schedulerOk = matchmakingScheduler.isSchedulerRunning();
    const stats = await matchmakingService.getStats();
    
    const status = redisOk && schedulerOk ? 'UP' : 'DOWN';
    const httpStatus = status === 'UP' ? 200 : 503;
    
    res.status(httpStatus).json({
      status,
      timestamp: new Date().toISOString(),
      service: {
        name: 'fnfo-matchmaking-service',
        version: '1.0.0',
        uptime: process.uptime(),
      },
      components: {
        redis: { status: redisOk ? 'UP' : 'DOWN' },
        scheduler: { status: schedulerOk ? 'UP' : 'DOWN' },
      },
      metrics: {
        pvpQueueSize: stats.pvpQueueSize,
        bossQueueSize: stats.bossQueueSize,
        totalRooms: stats.totalRooms,
        memoryUsage: process.memoryUsage(),
      },
    });
  })
);

module.exports = router;