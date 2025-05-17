// messaging/LocalQueueService.js
const EventEmitter = require('events');
const logger = require('../../utils/logger');

class LocalQueueService {
    constructor() {
        this.eventEmitter = new EventEmitter();
        this.queues = new Map(); // queueName -> messages[]
        this.subscribers = new Map(); // queueName -> callbacks[]
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return true;
        logger.info('Initializing local queue service');
        this.initialized = true;
        return true;
    }

    async getQueueLength(queueName) {
        if (!this.queues.has(queueName)) {
            return 0;
        }

        return this.queues.get(queueName).length;
    }

    async sendMessage(queueName, message, options = {}) {
        if (!this.initialized) await this.initialize();

        // Ensure queue exists
        if (!this.queues.has(queueName)) {
            this.queues.set(queueName, []);
        }

        // Add message to queue
        this.queues.get(queueName).push({
            body: message,
            options,
            id: Date.now() + '-' + Math.random().toString(36).substr(2, 9)
        });

        logger.debug(`Message sent to queue ${queueName}`);

        // Notify subscribers
        this.eventEmitter.emit(`message:${queueName}`);

        return true;
    }

    async receiveMessages(queueName, handleMessage, options = {}) {
        if (!this.initialized) await this.initialize();

        // Ensure queue exists
        if (!this.queues.has(queueName)) {
            this.queues.set(queueName, []);
        }

        // Add message handler
        if (!this.subscribers.has(queueName)) {
            this.subscribers.set(queueName, []);
        }

        this.subscribers.get(queueName).push(handleMessage);

        // Process existing messages
        this.processQueue(queueName);

        // Set up listener for new messages
        this.eventEmitter.on(`message:${queueName}`, () => {
            this.processQueue(queueName);
        });

        logger.info(`Started receiving messages from queue ${queueName}`);

        return {
            // Simulate closing the receiver
            close: async () => {
                const handlers = this.subscribers.get(queueName) || [];
                const index = handlers.indexOf(handleMessage);
                if (index !== -1) {
                    handlers.splice(index, 1);
                }
            }
        };
    }

    async processQueue(queueName) {
        const messages = this.queues.get(queueName) || [];
        const handlers = this.subscribers.get(queueName) || [];

        if (messages.length === 0 || handlers.length === 0) return;

        // Get the next message
        const message = messages.shift();

        // Process with all handlers
        for (const handler of handlers) {
            try {
                await handler(message.body);
            } catch (error) {
                logger.error(`Error processing message from queue ${queueName}:`, error);
            }
        }

        // Process the next message if there are more
        if (messages.length > 0) {
            // Use setTimeout to avoid blocking
            setTimeout(() => {
                this.processQueue(queueName);
            }, 10);
        }
    }

    async close() {
        logger.info('Closing local queue service');
        this.eventEmitter.removeAllListeners();
        this.queues.clear();
        this.subscribers.clear();
        this.initialized = false;
    }
}

module.exports = new LocalQueueService();