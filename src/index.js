/**
 * FNFO Matchmaking Service - Entry Point
 */

const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config');
const logger = require('./config/logger');
const { getRedisClient, closeConnections, healthCheck } = require('./config/redis');
const { initializeSocketIO } = require('./config/socketio');
const { matchmakingController, healthController } = require('./controllers');
const { notFoundHandler, errorHandler } = require('./middleware');
const matchmakingScheduler = require('./schedulers/MatchmakingScheduler');

const createApp = () => {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  }));

  // Rutas
  app.use('/health', healthController);
  app.use(`${config.server.apiPrefix}/matchmaking`, matchmakingController);

  app.get('/', (req, res) => {
    res.json({
      service: 'fnfo-matchmaking-service',
      version: '1.0.0',
      status: 'running',
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

const startServer = async () => {
  try {
    logger.info('='.repeat(50));
    logger.info('🎮 FNFO Matchmaking Service');
    logger.info('='.repeat(50));

    logger.info('Conectando a Redis...');
    const redisOk = await healthCheck();
    if (!redisOk) {
      throw new Error('No se pudo conectar a Redis');
    }
    logger.info('✅ Redis conectado');

    const app = createApp();
    const server = http.createServer(app);

    logger.info('Inicializando Socket.IO...');
    initializeSocketIO(server);
    logger.info('✅ Socket.IO inicializado');

    logger.info('Iniciando scheduler de matchmaking...');
    matchmakingScheduler.start();
    logger.info('✅ Scheduler iniciado');

    const port = config.server.port;
    server.listen(port, () => {
      logger.info('='.repeat(50));
      logger.info(`🚀 Servidor iniciado en puerto ${port}`);
      logger.info(`📡 API REST: http://localhost:${port}${config.server.apiPrefix}`);
      logger.info(`🔌 WebSocket: ws://localhost:${port}/socket.io`);
      logger.info(`❤️  Health: http://localhost:${port}/health`);
      logger.info('='.repeat(50));
    });

    const gracefulShutdown = async (signal) => {
      logger.info(`\n${signal} recibido. Iniciando cierre graceful...`);
      matchmakingScheduler.stop();
      server.close(() => logger.info('Servidor HTTP cerrado'));
      await closeConnections();
      logger.info('Cierre graceful completado');
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
      logger.error('Excepción no capturada', { error: error.message, stack: error.stack });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Promesa rechazada no manejada', { reason });
    });

  } catch (error) {
    logger.error('Error fatal al iniciar servidor', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

startServer();

module.exports = { createApp };