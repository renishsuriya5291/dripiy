const { Queue } = require('bullmq');
const Redis = require('ioredis');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const connection = new Redis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
});
const campaignQueue = new Queue('campaign-actions', { connection });

module.exports = campaignQueue;
