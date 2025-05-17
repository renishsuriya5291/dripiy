const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create a simple Proxy model
const ProxySchema = new mongoose.Schema({
    host: { type: String, required: true },
    port: { type: Number, required: true },
    protocol: { type: String, enum: ['http', 'https', 'socks5'], default: 'http' },
    username: String,
    password: String,
    region: { type: String, default: 'default' },
    status: { type: String, enum: ['active', 'inactive', 'testing', 'problematic'], default: 'testing' },
    lastChecked: Date,
    successCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
    issueCount: { type: Number, default: 0 },
    issues: [{
        timestamp: Date,
        description: String
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Proxy = mongoose.model('Proxy', ProxySchema);

// Export the model
module.exports = Proxy;

