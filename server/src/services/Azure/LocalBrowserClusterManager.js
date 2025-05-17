// services/LocalBrowserClusterManager.js
const { fork } = require('child_process');
const path = require('path');
const logger = require('../../utils/logger');
const localQueueService = require('./LocalQueueService');

// Constants
const BROWSER_ACTION_QUEUE = 'browser-actions';
const BROWSER_RESULT_QUEUE = 'browser-results';

class LocalBrowserClusterManager {
    constructor() {
        this.workers = new Map(); // workerId -> child process
        this.pendingActionCallbacks = new Map(); // actionId -> callback
        this.actionTimeouts = new Map(); // actionId -> timeout
        this.actionTimeoutMs = 5 * 60 * 1000; // 5 minutes
        this.initialized = false;
        this.maxWorkers = 3; // Maximum number of workers for local testing
    }

    async initialize() {
        if (this.initialized) return true;

        logger.info('Initializing Local Browser Cluster Manager');

        // Initialize queue service
        await localQueueService.initialize();

        // Start listening for action results
        await this.listenForActionResults();

        // Start initial workers
        await this.ensureWorkers(1); // Start with 1 worker

        this.initialized = true;
        logger.info('Local Browser Cluster Manager initialized');

        return true;
    }

    async listenForActionResults() {
        await localQueueService.receiveMessages(BROWSER_RESULT_QUEUE, async (result) => {
            try {
                const { actionId, success, data, error } = result;

                logger.debug(`Received result for action ${actionId}: ${success ? 'success' : 'error'}`);

                // Find the callback for this action
                if (this.pendingActionCallbacks.has(actionId)) {
                    const callback = this.pendingActionCallbacks.get(actionId);

                    // Clear the timeout
                    if (this.actionTimeouts.has(actionId)) {
                        clearTimeout(this.actionTimeouts.get(actionId));
                        this.actionTimeouts.delete(actionId);
                    }

                    // Call the callback
                    if (success) {
                        callback.resolve(data);
                    } else {
                        callback.reject(new Error(error || 'Unknown error'));
                    }

                    // Remove the callback
                    this.pendingActionCallbacks.delete(actionId);
                } else {
                    logger.warn(`Received action result for unknown action ${actionId}`);
                }
            } catch (error) {
                logger.error('Error processing action result:', error);
            }
        });

        logger.info('Started listening for browser action results');
    }
    async getWorkerCount() {
        return this.workers.size;
    }
    async executeAction(accountId, actionType, actionData) {
        if (!this.initialized) {
            await this.initialize();
        }

        // Ensure we have at least one worker
        await this.ensureWorkers(1);

        // Generate a unique action ID
        const actionId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);

        // Create the action message
        const actionMessage = {
            actionId,
            accountId,
            actionType,
            actionData,
            timestamp: Date.now()
        };

        // Create a promise that will be resolved/rejected when the action completes
        const actionPromise = new Promise((resolve, reject) => {
            // Store the callback
            this.pendingActionCallbacks.set(actionId, { resolve, reject });

            // Set a timeout to fail the action if it takes too long
            const timeout = setTimeout(() => {
                if (this.pendingActionCallbacks.has(actionId)) {
                    this.pendingActionCallbacks.delete(actionId);
                    this.actionTimeouts.delete(actionId);
                    reject(new Error(`Action timed out after ${this.actionTimeoutMs}ms`));
                }
            }, this.actionTimeoutMs);

            this.actionTimeouts.set(actionId, timeout);
        });

        // Send the action to the queue
        await localQueueService.sendMessage(BROWSER_ACTION_QUEUE, actionMessage);

        logger.debug(`Sent action ${actionType} to queue for account ${accountId}`);

        // Return the promise
        return actionPromise;
    }

    async ensureWorkers(minCount) {
        // Count active workers
        const activeWorkers = Array.from(this.workers.values()).filter(worker => worker.connected);

        // Start new workers if needed
        const workersToStart = Math.min(this.maxWorkers, minCount) - activeWorkers.length;

        if (workersToStart > 0) {
            logger.info(`Starting ${workersToStart} new browser workers`);

            for (let i = 0; i < workersToStart; i++) {
                await this.startWorker();
            }
        }
    }

    async startWorker() {
        try {
            // Generate a worker ID
            const workerId = 'worker-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

            logger.info(`Starting browser worker ${workerId}`);

            // Start the worker as a child process
            const workerProcess = fork(path.join(__dirname, 'LocalBrowserWorker.js'), [], {
                env: {
                    ...process.env,
                    WORKER_ID: workerId
                }
            });

            // Set up event handlers
            workerProcess.on('message', (message) => {
                if (message.type === 'ready') {
                    logger.info(`Browser worker ${workerId} is ready`);
                }
            });

            workerProcess.on('exit', (code) => {
                logger.info(`Browser worker ${workerId} exited with code ${code}`);
                this.workers.delete(workerId);

                // Start a new worker to replace it
                this.startWorker().catch(err => {
                    logger.error('Error starting replacement worker:', err);
                });
            });

            // Store the worker
            this.workers.set(workerId, workerProcess);

            // Wait for worker to be ready
            await new Promise((resolve) => {
                const readyHandler = (message) => {
                    if (message.type === 'ready') {
                        workerProcess.removeListener('message', readyHandler);
                        resolve();
                    }
                };

                workerProcess.on('message', readyHandler);

                // Timeout after 30 seconds
                setTimeout(() => {
                    workerProcess.removeListener('message', readyHandler);
                    resolve(); // Resolve anyway to continue
                }, 30000);
            });

            return workerId;
        } catch (error) {
            logger.error('Error starting browser worker:', error);
            throw error;
        }
    }

    async shutdown() {
        try {
            logger.info('Shutting down Local Browser Cluster Manager');

            // Reject all pending actions
            for (const [actionId, callback] of this.pendingActionCallbacks.entries()) {
                callback.reject(new Error('Browser Cluster Manager shutting down'));
            }
            this.pendingActionCallbacks.clear();

            // Clear all timeouts
            for (const [actionId, timeout] of this.actionTimeouts.entries()) {
                clearTimeout(timeout);
            }
            this.actionTimeouts.clear();

            // Stop all workers
            for (const [workerId, worker] of this.workers.entries()) {
                try {
                    worker.kill();
                } catch (error) {
                    logger.error(`Error stopping worker ${workerId}:`, error);
                }
            }
            this.workers.clear();

            // Close queue service
            await localQueueService.close();

            this.initialized = false;

            logger.info('Local Browser Cluster Manager shutdown complete');
        } catch (error) {
            logger.error('Error shutting down Local Browser Cluster Manager:', error);
        }
    }
}

module.exports = new LocalBrowserClusterManager();