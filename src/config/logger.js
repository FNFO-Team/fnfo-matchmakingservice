/**
 * Configuración de logging con Winston
 * Proporciona logging estructurado similar a SLF4J/Logback
 */

const winston = require('winston');
const config = require('./index');

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Formato personalizado para logs
const customFormat = printf(({ level, message, timestamp, ...meta }) => {
  let metaStr = '';
  if (Object.keys(meta).length > 0) {
    metaStr = ` ${JSON.stringify(meta)}`;
  }
  return `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}`;
});

// Formato para consola con colores
const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  customFormat
);

// Formato para archivos (sin colores)
const fileFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  customFormat
);

// Crear el logger
const logger = winston.createLogger({
  level: config.logging.level,
  transports: [
    // Consola - siempre activa
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
});

// En producción, agregar transporte a archivo
if (config.server.env === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: fileFormat,
    })
  );
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: fileFormat,
    })
  );
}

module.exports = logger;