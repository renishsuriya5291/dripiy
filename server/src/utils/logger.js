// utils/logger.js
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Custom format for console output
const consoleFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level.toUpperCase()}: ${message}`;
});

// Create the logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'linkedin-automation' },
  transports: [
    // Console logs
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        consoleFormat
      )
    }),
    // Info logs file
    new winston.transports.File({ 
      filename: path.join(logsDir, 'info.log'),
      level: 'info' 
    }),
    // Error logs file
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'),
      level: 'error' 
    })
  ]
});

// Add debug logs in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.File({ 
      filename: path.join(logsDir, 'debug.log'),
      level: 'debug' 
    })
  );
}

module.exports = logger;