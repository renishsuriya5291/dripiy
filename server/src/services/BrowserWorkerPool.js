// Enhanced BrowserWorkerPool.js - Add this new file
import LinkedInBrowser from './LinkedInBrowser';
import { info, error as _error, warn } from '../utils/logger';
import LinkedInAccount from '../models/LinkedInAccount';

/**
 * Manages a pool of browser workers, one per LinkedIn account
 * This ensures no conflicts between different account operations
 */
class BrowserWorkerPool {
  constructor() {
    this.workers = new Map(); // Map of accountId -> {browser, busy, queue, lastAction}
    this.maxIdleTime = 30 * 60 * 1000; // 30 minutes
    this.maxWorkers = 5; // Maximum concurrent browser instances
    this.workerTimeouts = new Map(); // For worker cleanup timeouts
    
    // Start the cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanupIdleWorkers(), 10 * 60 * 1000);
  }
  
  /**
   * Get a worker for a specific account
   * @param {string} accountId - LinkedIn account ID
   * @returns {Promise<Object>} Worker object with browser instance
   */
  async getWorker(accountId) {
    // Check if worker already exists
    if (this.workers.has(accountId)) {
      const worker = this.workers.get(accountId);
      
      // Reset cleanup timeout if it exists
      if (this.workerTimeouts.has(accountId)) {
        clearTimeout(this.workerTimeouts.get(accountId));
        this.workerTimeouts.delete(accountId);
      }
      
      return worker;
    }
    
    // Check if we need to clean up existing workers before creating a new one
    if (this.workers.size >= this.maxWorkers) {
      await this.cleanupLeastRecentWorker();
    }
    
    // Create a new worker
    info(`Creating new browser worker for account ${accountId}`);
    const browser = new LinkedInBrowser();
    browser.isHeadless = true;
    
    // Initialize browser
    const initialized = await browser.initialize();
    if (!initialized) {
      throw new Error(`Failed to initialize browser for account ${accountId}`);
    }
    
    // Create worker object
    const worker = {
      browser,
      busy: false,
      queue: [], // Action queue for this worker
      lastAction: Date.now()
    };
    
    // Store in map
    this.workers.set(accountId, worker);
    
    return worker;
  }
  
  /**
   * Execute an action with a worker
   * @param {string} accountId - LinkedIn account ID
   * @param {Function} actionFunction - Function to execute with the browser
   * @param {boolean} immediate - If true, execute immediately, otherwise queue
   */
  async executeAction(accountId, actionFunction, immediate = false) {
    const worker = await this.getWorker(accountId);
    
    // If the worker is busy and we don't want immediate execution, queue the action
    if (worker.busy && !immediate) {
      return new Promise((resolve, reject) => {
        worker.queue.push({ actionFunction, resolve, reject });
        info(`Queued action for account ${accountId}, queue length: ${worker.queue.length}`);
      });
    }
    
    // Mark worker as busy
    worker.busy = true;
    worker.lastAction = Date.now();
    
    try {
      // Execute the action
      const result = await actionFunction(worker.browser);
      
      // Process next item in queue if any
      this.processNextInQueue(accountId);
      
      // Set auto-cleanup timeout
      this.setWorkerCleanupTimeout(accountId);
      
      return result;
    } catch (error) {
      _error(`Error executing action with browser worker for account ${accountId}:`, error);
      
      // If browser critically failed, remove the worker
      if (this.isCriticalBrowserError(error)) {
        warn(`Browser worker for account ${accountId} critically failed, removing`);
        await this.removeWorker(accountId);
      } else {
        // Otherwise process next in queue
        this.processNextInQueue(accountId);
      }
      
      throw error;
    }
  }
  
  /**
   * Process the next action in the queue for an account
   * @param {string} accountId - LinkedIn account ID
   */
  async processNextInQueue(accountId) {
    if (!this.workers.has(accountId)) return;
    
    const worker = this.workers.get(accountId);
    const nextAction = worker.queue.shift();
    
    if (!nextAction) {
      // No more actions in queue, mark as not busy
      worker.busy = false;
      return;
    }
    
    // Keep worker busy
    worker.busy = true;
    worker.lastAction = Date.now();
    
    try {
      // Execute the next action
      const result = await nextAction.actionFunction(worker.browser);
      nextAction.resolve(result);
    } catch (error) {
      nextAction.reject(error);
      
      // If critical error, remove worker
      if (this.isCriticalBrowserError(error)) {
        warn(`Browser worker for account ${accountId} critically failed, removing`);
        await this.removeWorker(accountId);
        return;
      }
    }
    
    // Process the next action in queue
    this.processNextInQueue(accountId);
  }
  
  /**
   * Check if an error is a critical browser error
   * @param {Error} error - The error to check
   * @returns {boolean} True if critical
   */
  isCriticalBrowserError(error) {
    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes('browser has disconnected') ||
      errorMessage.includes('browser closed') ||
      errorMessage.includes('session expired') ||
      errorMessage.includes('security challenge')
    );
  }
  
  /**
   * Remove a worker and clean up its resources
   * @param {string} accountId - LinkedIn account ID
   */
  async removeWorker(accountId) {
    if (!this.workers.has(accountId)) return;
    
    const worker = this.workers.get(accountId);
    
    // Reject all queued actions
    worker.queue.forEach(action => {
      action.reject(new Error('Browser worker was removed'));
    });
    worker.queue = [];
    
    // Cleanup browser
    try {
      await worker.browser.cleanup(false);
    } catch (error) {
      _error(`Error cleaning up browser for account ${accountId}:`, error);
    }
    
    // Remove worker
    this.workers.delete(accountId);
    
    // Clear timeout if exists
    if (this.workerTimeouts.has(accountId)) {
      clearTimeout(this.workerTimeouts.get(accountId));
      this.workerTimeouts.delete(accountId);
    }
  }
  
  /**
   * Set a timeout to clean up a worker after a period of inactivity
   * @param {string} accountId - LinkedIn account ID
   */
  setWorkerCleanupTimeout(accountId) {
    // Clear existing timeout if any
    if (this.workerTimeouts.has(accountId)) {
      clearTimeout(this.workerTimeouts.get(accountId));
    }
    
    // Set new timeout
    const timeout = setTimeout(async () => {
      info(`Cleaning up idle browser worker for account ${accountId}`);
      await this.removeWorker(accountId);
    }, this.maxIdleTime);
    
    this.workerTimeouts.set(accountId, timeout);
  }
  
  /**
   * Clean up workers that have been idle for too long
   */
  async cleanupIdleWorkers() {
    const now = Date.now();
    
    for (const [accountId, worker] of this.workers.entries()) {
      // Skip busy workers
      if (worker.busy) continue;
      
      // Check if idle for too long
      if (now - worker.lastAction > this.maxIdleTime) {
        info(`Cleaning up idle browser worker for account ${accountId}`);
        await this.removeWorker(accountId);
      }
    }
  }
  
  /**
   * Clean up the least recently used worker
   */
  async cleanupLeastRecentWorker() {
    let oldestTime = Infinity;
    let oldestAccountId = null;
    
    // Find the least recently used worker that is not busy
    for (const [accountId, worker] of this.workers.entries()) {
      if (!worker.busy && worker.lastAction < oldestTime) {
        oldestTime = worker.lastAction;
        oldestAccountId = accountId;
      }
    }
    
    // If found, remove it
    if (oldestAccountId) {
      info(`Cleaning up least recently used browser worker for account ${oldestAccountId}`);
      await this.removeWorker(oldestAccountId);
    } else {
      // If all workers are busy, wait for one to become available
      warn('All browser workers are busy, waiting for one to become available');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  /**
   * Shutdown the worker pool
   */
  async shutdown() {
    // Clear the cleanup interval
    clearInterval(this.cleanupInterval);
    
    // Clear all timeouts
    for (const timeout of this.workerTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.workerTimeouts.clear();
    
    // Close all browsers
    info(`Shutting down browser worker pool with ${this.workers.size} workers`);
    for (const [accountId, worker] of this.workers.entries()) {
      try {
        await worker.browser.cleanup(false);
      } catch (error) {
        _error(`Error cleaning up browser for account ${accountId} during shutdown:`, error);
      }
    }
    
    // Clear workers
    this.workers.clear();
  }
}

export default new BrowserWorkerPool();