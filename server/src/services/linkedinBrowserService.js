// services/LinkedInBrowserService.js
const logger = require('../utils/logger');
// const localBrowserClusterManager = require('./Azure/LocalBrowserClusterManager');
const localProxyManager = require('./Azure/LocalProxyManager');
const localRateLimiter = require('../utils/LocalRateLimiter');
const localBrowserClusterManager = require('./SimplifiedBrowserClusterManager');


class LinkedInBrowserService {
  constructor() {
    // Configuration for rate limiting
    this.actionDelays = {
      viewProfile: { min: 5000, max: 15000 }, // 5-15 seconds
      sendConnectionRequest: { min: 10000, max: 30000 }, // 10-30 seconds
      sendMessage: { min: 8000, max: 20000 }, // 8-20 seconds
      followProfile: { min: 5000, max: 15000 }, // 5-15 seconds
      likePost: { min: 5000, max: 15000 } // 5-15 seconds
    };

    // Initialize dependencies
    this.browserClusterManager = localBrowserClusterManager;
    this.proxyManager = localProxyManager;
    this.rateLimiter = localRateLimiter;
  }

  /**
   * Get random delay within range for an action type
   * @param {string} actionType - Type of action
   * @returns {number} Delay in milliseconds
   */
  getRandomDelay(actionType) {
    const delay = this.actionDelays[actionType] || { min: 15000, max: 30000 };
    return Math.floor(Math.random() * (delay.max - delay.min + 1)) + delay.min;
  }

  /**
   * Initialize the LinkedIn browser service
   */
  async initialize() {
    try {
      logger.info('Initializing LinkedIn Browser Service');

      // Initialize dependencies
      await this.browserClusterManager.initialize();
      await this.proxyManager.initialize();
      await this.rateLimiter.initialize();

      logger.info('LinkedIn Browser Service initialized');
      return true;
    } catch (error) {
      logger.error('Error initializing LinkedIn Browser Service:', error);
      throw error;
    }
  }

  /**
   * View a LinkedIn profile
   * @param {string} accountId - LinkedIn account ID
   * @param {string} profileUrl - Target profile URL
   */
  async viewProfile(accountId, profileUrl) {
    try {
      // Check rate limits
      if (!await this.rateLimiter.checkLimit(accountId, 'viewProfile')) {
        throw new Error('Rate limit exceeded for profile viewing');
      }

      logger.info(`Viewing profile ${profileUrl} from account ${accountId}`);

      // Skip proxy handling completely if disabled
      let proxyConfig = null;
      if (process.env.SKIP_PROXIES !== 'true') {
        // Get proxy for this account
        const proxy = await this.proxyManager.getProxyForAccount(accountId);
        if (proxy) {
          proxyConfig = {
            host: proxy.host,
            port: proxy.port,
            username: proxy.username,
            password: proxy.password
          };
        }
      } else {
        logger.info(`Proxy usage disabled - using direct connection for account ${accountId}`);
      }

      // Execute profile view using the browser cluster
      const result = await this.browserClusterManager.executeAction(accountId, 'viewProfile', {
        profileUrl,
        proxy: proxyConfig
      });

      // Record rate limit usage
      await this.rateLimiter.recordUsage(accountId, 'viewProfile');

      // Respect rate limits with a delay before returning
      await new Promise(resolve => setTimeout(resolve, this.getRandomDelay('viewProfile')));

      return {
        success: true,
        action: 'profile_viewed',
        message: 'Profile viewed successfully',
        ...result
      };
    } catch (error) {
      logger.error(`Error in viewProfile for ${profileUrl}:`, error);
      throw error;
    }
  }

  /**
   * Send a connection request
   * @param {string} accountId - LinkedIn account ID
   * @param {string} profileUrl - Target profile URL
   * @param {string} message - Optional connection message
   */
  async sendConnectionRequest(accountId, profileUrl, message = null) {
    try {
      // Check rate limits
      if (!await this.rateLimiter.checkLimit(accountId, 'sendConnectionRequest')) {
        throw new Error('Rate limit exceeded for connection requests');
      }

      logger.info(`Sending connection request to ${profileUrl} from account ${accountId}`);

      // Get proxy for this account
      const proxy = await this.proxyManager.getProxyForAccount(accountId);

      // Execute connection request using the browser cluster
      const result = await this.browserClusterManager.executeAction(accountId, 'sendConnectionRequest', {
        profileUrl,
        message,
        proxy: proxy ? {
          host: proxy.host,
          port: proxy.port,
          username: proxy.username,
          password: proxy.password
        } : null
      });

      // Record rate limit usage
      await this.rateLimiter.recordUsage(accountId, 'sendConnectionRequest');

      // Respect rate limits with a delay before returning
      await new Promise(resolve => setTimeout(resolve, this.getRandomDelay('sendConnectionRequest')));

      return {
        success: true,
        action: result.action || 'connection_request_sent',
        message: result.message || 'Connection request sent successfully',
        ...result
      };
    } catch (error) {
      logger.error(`Error in sendConnectionRequest for ${profileUrl}:`, error);
      throw error;
    }
  }

  /**
   * Send a message to a LinkedIn connection
   * @param {string} accountId - LinkedIn account ID
   * @param {string} profileUrl - Target profile URL
   * @param {string} message - Message to send
   */
  async sendMessage(accountId, profileUrl, message) {
    try {
      // Check rate limits
      if (!await this.rateLimiter.checkLimit(accountId, 'sendMessage')) {
        throw new Error('Rate limit exceeded for messages');
      }

      logger.info(`Sending message to ${profileUrl} from account ${accountId}`);

      // Get proxy for this account
      const proxy = await this.proxyManager.getProxyForAccount(accountId);

      // Execute message send using the browser cluster
      const result = await this.browserClusterManager.executeAction(accountId, 'sendMessage', {
        profileUrl,
        message,
        proxy: proxy ? {
          host: proxy.host,
          port: proxy.port,
          username: proxy.username,
          password: proxy.password
        } : null
      });

      // Record rate limit usage
      await this.rateLimiter.recordUsage(accountId, 'sendMessage');

      // Respect rate limits with a delay before returning
      await new Promise(resolve => setTimeout(resolve, this.getRandomDelay('sendMessage')));

      return {
        success: true,
        action: 'message_sent',
        message: 'Message sent successfully',
        ...result
      };
    } catch (error) {
      logger.error(`Error in sendMessage for ${profileUrl}:`, error);
      throw error;
    }
  }

  /**
   * Follow a LinkedIn profile
   * @param {string} accountId - LinkedIn account ID
   * @param {string} profileUrl - Target profile URL
   */
  async followProfile(accountId, profileUrl) {
    try {
      // Check rate limits
      if (!await this.rateLimiter.checkLimit(accountId, 'followProfile')) {
        throw new Error('Rate limit exceeded for profile following');
      }

      logger.info(`Following profile ${profileUrl} from account ${accountId}`);

      // Get proxy for this account
      const proxy = await this.proxyManager.getProxyForAccount(accountId);

      // Execute follow profile using the browser cluster
      const result = await this.browserClusterManager.executeAction(accountId, 'followProfile', {
        profileUrl,
        proxy: proxy ? {
          host: proxy.host,
          port: proxy.port,
          username: proxy.username,
          password: proxy.password
        } : null
      });

      // Record rate limit usage
      await this.rateLimiter.recordUsage(accountId, 'followProfile');

      // Respect rate limits with a delay before returning
      await new Promise(resolve => setTimeout(resolve, this.getRandomDelay('followProfile')));

      return {
        success: true,
        action: result.action || 'profile_followed',
        message: result.message || 'Profile followed successfully',
        ...result
      };
    } catch (error) {
      logger.error(`Error in followProfile for ${profileUrl}:`, error);
      throw error;
    }
  }

  /**
   * Like a post from a profile
   * @param {string} accountId - LinkedIn account ID
   * @param {string} profileUrl - Target profile URL
   */
  async likePost(accountId, profileUrl) {
    try {
      // Check rate limits
      if (!await this.rateLimiter.checkLimit(accountId, 'likePost')) {
        throw new Error('Rate limit exceeded for post liking');
      }

      logger.info(`Liking post from profile ${profileUrl} using account ${accountId}`);

      // Get proxy for this account
      const proxy = await this.proxyManager.getProxyForAccount(accountId);

      // Execute like post using the browser cluster
      const result = await this.browserClusterManager.executeAction(accountId, 'likePost', {
        profileUrl,
        proxy: proxy ? {
          host: proxy.host,
          port: proxy.port,
          username: proxy.username,
          password: proxy.password
        } : null
      });

      // Record rate limit usage
      await this.rateLimiter.recordUsage(accountId, 'likePost');

      // Respect rate limits with a delay before returning
      await new Promise(resolve => setTimeout(resolve, this.getRandomDelay('likePost')));

      return {
        success: true,
        action: result.action || 'post_liked',
        message: result.message || 'Post liked successfully',
        ...result
      };
    } catch (error) {
      logger.error(`Error in likePost for ${profileUrl}:`, error);
      throw error;
    }
  }

  /**
   * Shutdown the browser service
   */
  async shutdown() {
    try {
      logger.info('Shutting down LinkedIn Browser Service');

      // Shutdown dependencies
      await this.browserClusterManager.shutdown();

      logger.info('LinkedIn Browser Service shutdown complete');
    } catch (error) {
      logger.error('Error shutting down LinkedIn Browser Service:', error);
    }
  }
}

module.exports = new LinkedInBrowserService();