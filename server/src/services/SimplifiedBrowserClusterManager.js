// services/SimplifiedBrowserClusterManager.js
const LinkedInBrowser = require('./LinkedInBrowser');
const mongoose = require('mongoose');
const LinkedInAccount = require('../models/LinkedInAccount');
const logger = require('../utils/logger');

class SimplifiedBrowserClusterManager {
  constructor() {
    this.browsers = new Map(); // accountId -> browser
    this.initialized = false;
    this.actionTimeoutMs = 60 * 1000; // 60 seconds instead of 300 seconds
  }

  async initialize() {
    logger.info('Initializing Simplified Browser Cluster Manager');
    this.initialized = true;
    return true;
  }

  async getWorkerCount() {
    return this.browsers.size;
  }

  async executeAction(accountId, actionType, actionData) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    logger.info(`Executing ${actionType} for account ${accountId}`);
    
    try {
      // Get or create browser for this account
      const browser = await this.getBrowserForAccount(accountId, actionData.proxy);
      
      if (!browser) {
        throw new Error(`Could not get browser for account ${accountId}`);
      }
      
      // Set timeout for the operation
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Action timed out after ${this.actionTimeoutMs}ms`));
        }, this.actionTimeoutMs);
      });
      
      // Execute action directly
      let actionPromise;
      
      switch (actionType) {
        case 'viewProfile':
          actionPromise = this.viewProfile(browser, actionData);
          break;
        case 'sendConnectionRequest':
          actionPromise = this.sendConnectionRequest(browser, actionData);
          break;
        case 'sendMessage':
          actionPromise = this.sendMessage(browser, actionData);
          break;
        case 'followProfile':
          actionPromise = this.followProfile(browser, actionData);
          break;
        case 'likePost':
          actionPromise = this.likePost(browser, actionData);
          break;
        default:
          throw new Error(`Unsupported action type: ${actionType}`);
      }
      
      // Race between the action and the timeout
      const result = await Promise.race([actionPromise, timeoutPromise]);
      
      return result;
    } catch (error) {
      logger.error(`Error executing ${actionType} for account ${accountId}:`, error);
      
      // If the browser failed, remove it to get a fresh one next time
      if (this.browsers.has(accountId)) {
        try {
          const browser = this.browsers.get(accountId);
          await browser.cleanup(false);
        } catch (cleanupError) {
          logger.error(`Error cleaning up browser for account ${accountId}:`, cleanupError);
        }
        this.browsers.delete(accountId);
      }
      
      throw error;
    }
  }

  async getBrowserForAccount(accountId, proxy = null) {
    try {
      // Check if we already have a browser for this account
      if (this.browsers.has(accountId)) {
        return this.browsers.get(accountId);
      }
      
      // Get LinkedIn account from database
      const account = await LinkedInAccount.findById(accountId);
      
      if (!account || account.status !== 'active') {
        throw new Error(`LinkedIn account ${accountId} not found or not active`);
      }
      
      // Create a new browser instance
      const browser = new LinkedInBrowser();
      browser.account = account; // Set the account
      
      // Use headless mode for production system
      browser.isHeadless = process.env.BROWSER_HEADLESS === 'true';
      
      // Set proxy if provided
      if (proxy) {
        browser.proxyConfig = proxy;
      }
      
      // Initialize browser
      const initialized = await browser.initialize();
      
      if (!initialized) {
        throw new Error(`Failed to initialize browser for account ${accountId}`);
      }
      
      // Store browser
      this.browsers.set(accountId, browser);
      
      return browser;
    } catch (error) {
      logger.error(`Error getting browser for account ${accountId}:`, error);
      throw error;
    }
  }

  // Implementation of LinkedIn actions
  async viewProfile(browser, actionData) {
    const { profileUrl } = actionData;
    
    logger.info(`Viewing profile: ${profileUrl}`);
    
    // Use your existing visitProfile method
    const success = await browser.visitProfile(profileUrl);
    
    if (!success) {
      throw new Error(`Failed to visit profile ${profileUrl}`);
    }
    
    return {
      action: 'profile_viewed',
      message: 'Profile viewed successfully',
      url: profileUrl
    };
  }

  async sendConnectionRequest(browser, actionData) {
    const { profileUrl, message } = actionData;
    
    logger.info(`Sending connection request to: ${profileUrl}`);
    
    // Visit profile first
    const visitSuccess = await browser.visitProfile(profileUrl);
    if (!visitSuccess) {
      throw new Error(`Failed to visit profile ${profileUrl}`);
    }
    
    // Check connection status
    const connectionStatus = await browser.checkConnectionStatus();
    
    if (connectionStatus.status === 'connected') {
      return {
        action: 'already_connected',
        message: 'Already connected with this person',
        url: profileUrl
      };
    }
    
    if (connectionStatus.status === 'pending') {
      return {
        action: 'already_pending',
        message: 'Connection request already pending',
        url: profileUrl
      };
    }
    
    // Use your existing method to send a connection request
    const result = await browser.visitAndConnect(profileUrl, message);
    
    if (!result.success) {
      throw new Error(`Failed to send connection request: ${result.message}`);
    }
    
    return {
      action: 'connection_request_sent',
      message: 'Connection request sent successfully',
      url: profileUrl
    };
  }

  async sendMessage(browser, actionData) {
    // Placeholder - implement with your browser methods
    return { action: 'message_sent', message: 'Message sent successfully' };
  }

  async followProfile(browser, actionData) {
    // Placeholder - implement with your browser methods
    return { action: 'profile_followed', message: 'Profile followed successfully' };
  }

  async likePost(browser, actionData) {
    // Placeholder - implement with your browser methods
    return { action: 'post_liked', message: 'Post liked successfully' };
  }

  async shutdown() {
    logger.info('Shutting down Simplified Browser Cluster Manager');
    
    // Close all browsers
    for (const [accountId, browser] of this.browsers.entries()) {
      try {
        await browser.cleanup(false);
        logger.info(`Closed browser for account ${accountId}`);
      } catch (error) {
        logger.error(`Error closing browser for account ${accountId}:`, error);
      }
    }
    
    this.browsers.clear();
    this.initialized = false;
    
    logger.info('Simplified Browser Cluster Manager shut down');
  }
}

module.exports = new SimplifiedBrowserClusterManager();