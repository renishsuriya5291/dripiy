// config/index.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0'
  },
  
  // MongoDB configuration
  mongodb: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/linkedin-automation'
  },
  
  // LinkedIn automation configuration
  linkedIn: {
    browserWorkers: {
      min: parseInt(process.env.MIN_BROWSER_WORKERS || '1'),
      max: parseInt(process.env.MAX_BROWSER_WORKERS || '3') // Keep this low for local testing
    },
    actions: {
      batchSize: parseInt(process.env.ACTION_BATCH_SIZE || '5'),
      processingInterval: parseInt(process.env.ACTION_PROCESSING_INTERVAL || '300000') // 5 minutes
    },
    rateLimits: {
      connectionRequests: parseInt(process.env.RATE_LIMIT_CONNECTION_REQUESTS || '100'),
      messages: parseInt(process.env.RATE_LIMIT_MESSAGES || '100'),
      profileViews: parseInt(process.env.RATE_LIMIT_PROFILE_VIEWS || '250'),
      totalActions: parseInt(process.env.RATE_LIMIT_TOTAL_ACTIONS || '500')
    }
  },
  
  // Local testing configuration
  local: {
    useRealProxies: process.env.USE_REAL_PROXIES === 'true' || false,
    browserWorkerCount: parseInt(process.env.LOCAL_BROWSER_WORKER_COUNT || '2')
  }
};

module.exports = config;