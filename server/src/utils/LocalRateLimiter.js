// utils/LocalRateLimiter.js
const logger = require('./logger');

class LocalRateLimiter {
  constructor() {
    this.limits = {
      sendConnectionRequest: 100,
      sendMessage: 100,
      viewProfile: 250,
      followProfile: 100,
      likePost: 100,
      total: 500
    };
    
    this.usage = new Map(); // accountId -> { actionType: count, total: count, lastReset: timestamp }
  }

  async initialize() {
    logger.info('Initializing Local Rate Limiter');
    return true;
  }

  async checkLimit(accountId, actionType) {
    // Get or initialize usage
    if (!this.usage.has(accountId)) {
      this.usage.set(accountId, {
        lastReset: Date.now(),
        total: 0
      });
    }
    
    const usage = this.usage.get(accountId);
    
    // Reset daily counts if needed
    if (Date.now() - usage.lastReset > 24 * 60 * 60 * 1000) {
      Object.keys(this.limits).forEach(key => {
        usage[key] = 0;
      });
      usage.total = 0;
      usage.lastReset = Date.now();
    }
    
    // Initialize action count if needed
    if (!usage[actionType]) {
      usage[actionType] = 0;
    }
    
    // Check limits
    const actionLimit = this.limits[actionType] || 100;
    const totalLimit = this.limits.total;
    
    if (usage[actionType] >= actionLimit) {
      logger.warn(`Rate limit exceeded for account ${accountId}, action ${actionType}: ${usage[actionType]}/${actionLimit}`);
      return false;
    }
    
    if (usage.total >= totalLimit) {
      logger.warn(`Total rate limit exceeded for account ${accountId}: ${usage.total}/${totalLimit}`);
      return false;
    }
    
    return true;
  }

  async recordUsage(accountId, actionType) {
    // Get or initialize usage
    if (!this.usage.has(accountId)) {
      this.usage.set(accountId, {
        lastReset: Date.now(),
        total: 0
      });
    }
    
    const usage = this.usage.get(accountId);
    
    // Initialize action count if needed
    if (!usage[actionType]) {
      usage[actionType] = 0;
    }
    
    // Increment counts
    usage[actionType]++;
    usage.total++;
    
    logger.debug(`Recorded usage for account ${accountId}, action ${actionType}: ${usage[actionType]}`);
  }

  async getUsage(accountId) {
    return this.usage.get(accountId) || {
      lastReset: Date.now(),
      total: 0
    };
  }

  async resetUsage(accountId) {
    if (this.usage.has(accountId)) {
      const usage = this.usage.get(accountId);
      Object.keys(this.limits).forEach(key => {
        usage[key] = 0;
      });
      usage.total = 0;
      usage.lastReset = Date.now();
      
      logger.info(`Reset usage for account ${accountId}`);
    }
  }
}

module.exports = new LocalRateLimiter();