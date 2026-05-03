/**
 * 日志工具
 */
const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: path.join(process.env.LOG_DIR || './logs', 'error.log'), 
      level: 'error',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: path.join(process.env.LOG_DIR || './logs', 'combined.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

module.exports = logger;
