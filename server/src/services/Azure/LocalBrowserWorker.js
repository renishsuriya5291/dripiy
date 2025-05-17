// workers/LocalBrowserWorker.js
const LinkedInBrowser = require('../LinkedInBrowser'); // Path to your LinkedIn browser
const mongoose = require('mongoose');
const LinkedInAccount = require('../../models/LinkedInAccount');
const localQueueService = require('./LocalQueueService');
const logger = require('../../utils/logger');
const config = require('../../config');

// Constants
const BROWSER_ACTION_QUEUE = 'browser-actions';
const BROWSER_RESULT_QUEUE = 'browser-results';

class LocalBrowserWorker {
  constructor() {
    this.browsers = new Map(); // accountId -> browser
    this.workerId = process.env.WORKER_ID || `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.isRunning = false;
  }

  async initialize() {
    try {
      logger.info(`Initializing Browser Worker ${this.workerId}`);
      
      // Connect to MongoDB
      await mongoose.connect(config.mongodb.uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      logger.info('Connected to MongoDB');
      
      // Initialize queue service
      await localQueueService.initialize();
      logger.info('Queue service initialized');
      
      // Start listening for browser actions
      await this.startListening();
      
      this.isRunning = true;
      logger.info(`Browser Worker ${this.workerId} initialized and listening for actions`);
      
      // Notify parent process if we're a child process
      if (process.send) {
        process.send({ type: 'ready' });
      }
      
      return true;
    } catch (error) {
      logger.error('Error initializing Browser Worker:', error);
      throw error;
    }
  }

  async startListening() {
    await localQueueService.receiveMessages(BROWSER_ACTION_QUEUE, async (action) => {
      try {
        const { actionId, accountId, actionType, actionData } = action;
        
        logger.info(`Received ${actionType} action ${actionId} for account ${accountId}`);
        
        // Execute the action
        try {
          const result = await this.executeAction(accountId, actionType, actionData);
          
          // Send back the result
          await localQueueService.sendMessage(BROWSER_RESULT_QUEUE, {
            actionId,
            success: true,
            data: result,
            workerId: this.workerId,
            timestamp: Date.now()
          });
          
          logger.info(`Completed ${actionType} action ${actionId} for account ${accountId}`);
        } catch (error) {
          logger.error(`Error executing ${actionType} action ${actionId}:`, error);
          
          // Send back error result
          await localQueueService.sendMessage(BROWSER_RESULT_QUEUE, {
            actionId,
            success: false,
            error: error.message,
            workerId: this.workerId,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        logger.error(`Error processing action:`, error);
      }
    });
  }

  async executeAction(accountId, actionType, actionData) {
    try {
      // Get or initialize browser for this account
      const browser = await this.getBrowserForAccount(accountId, actionData.proxy);
      
      if (!browser) {
        throw new Error(`Could not initialize browser for account ${accountId}`);
      }
      
      // Execute the appropriate action
      switch (actionType) {
        case 'viewProfile':
          return await this.viewProfile(browser, actionData);
        case 'sendConnectionRequest':
          return await this.sendConnectionRequest(browser, actionData);
        case 'sendMessage':
          return await this.sendMessage(browser, actionData);
        case 'followProfile':
          return await this.followProfile(browser, actionData);
        case 'likePost':
          return await this.likePost(browser, actionData);
        default:
          throw new Error(`Unsupported action type: ${actionType}`);
      }
    } catch (error) {
      logger.error(`Error executing ${actionType} for account ${accountId}:`, error);
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
      browser.isHeadless = false; // Make it headless for local testing
      
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
      logger.error(`Error initializing browser for account ${accountId}:`, error);
      throw error;
    }
  }

  // LinkedIn action implementations
  // These methods will use your existing LinkedInBrowser implementation
  
  async viewProfile(browser, actionData) {
    const { profileUrl } = actionData;
    
    logger.info(`Viewing profile: ${profileUrl}`);
    
    // Use your existing viewProfile method
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
    
    // Navigate to the profile
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
    
    // Send connection request using your existing method
    // You'll need to adapt this to your actual LinkedInBrowser implementation
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

  // Implement other methods (sendMessage, followProfile, likePost) similarly
  // using your existing LinkedInBrowser implementation
  
  async shutdown() {
    try {
      this.isRunning = false;
      logger.info(`Shutting down Browser Worker ${this.workerId}`);
      
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
      
      // Close MongoDB connection
      await mongoose.connection.close();
      
      logger.info(`Browser Worker ${this.workerId} shutdown complete`);
    } catch (error) {
      logger.error('Error shutting down Browser Worker:', error);
    }
  }
}

// Start the worker if this file is run directly
if (require.main === module) {
  const worker = new LocalBrowserWorker();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down...');
    await worker.shutdown();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down...');
    await worker.shutdown();
    process.exit(0);
  });
  
  process.on('message', async (message) => {
    if (message.type === 'shutdown') {
      logger.info('Received shutdown message from parent process');
      await worker.shutdown();
      process.exit(0);
    }
  });
  
  // Start the worker
  worker.initialize().catch(error => {
    logger.error('Failed to initialize worker:', error);
    process.exit(1);
  });
}

module.exports = LocalBrowserWorker;