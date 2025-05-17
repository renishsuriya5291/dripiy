// services/LocalProxyManager.js
const mongoose = require('mongoose');
const axios = require('axios');
const logger = require('../../utils/logger');

const Proxy = require('../../models/Proxy'); // Assuming you have a Proxy model defined
class LocalProxyManager {
    constructor() {
        this.proxyCacheByRegion = new Map(); // region -> proxies
        this.accountToProxy = new Map(); // accountId -> proxyId
        this.proxyUsage = new Map(); // proxyId -> usageCount
        this.lastRefresh = null;
        this.refreshInterval = 60 * 60 * 1000; // 1 hour
        this.proxyTestUrl = 'https://www.linkedin.com';
        this.proxyTestTimeout = 10000; // 10 seconds

        // Free proxy API URLs
        this.freeProxyApis = [
            'https://www.proxy-list.download/api/v1/get?type=http',
            'https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all'
        ];
    }

    async initialize() {
        try {
            logger.info('Initializing Local Proxy Manager');

            // Skip proxy fetching and testing completely when proxies are disabled
            if (process.env.SKIP_PROXIES === 'true') {
                logger.info('Proxy usage is disabled - skipping proxy initialization');
                this.lastRefresh = Date.now(); // Set this to avoid refresh attempts
                return true;
            }

            // Check if we have proxies in the database
            const proxyCount = await Proxy.countDocuments();

            if (proxyCount === 0) {
                logger.info('No proxies found, fetching free proxies');
                await this.fetchAndSaveFreeProxies();
            }

            await this.refreshProxies();

            logger.info('Local Proxy Manager initialized');
            return true;
        } catch (error) {
            logger.error('Error initializing Local Proxy Manager:', error);
            return false;
        }
    }

    async fetchAndSaveFreeProxies() {
        try {
            logger.info('Fetching free proxies');

            const proxies = [];

            // Try each proxy API
            for (const apiUrl of this.freeProxyApis) {
                try {
                    const response = await axios.get(apiUrl, { timeout: 5000 });

                    if (response.status === 200) {
                        const text = response.data;

                        // Parse the proxy list (format: ip:port)
                        const lines = typeof text === 'string' ? text.split('\n') : [];

                        for (const line of lines) {
                            const parts = line.trim().split(':');

                            if (parts.length === 2) {
                                const [host, portStr] = parts;
                                const port = parseInt(portStr, 10);

                                if (host && !isNaN(port)) {
                                    proxies.push({
                                        host,
                                        port,
                                        protocol: 'http',
                                        region: 'default',
                                        status: 'testing'
                                    });
                                }
                            }
                        }

                        logger.info(`Found ${proxies.length} proxies from ${apiUrl}`);
                    }
                } catch (apiError) {
                    logger.error(`Error fetching proxies from ${apiUrl}:`, apiError);
                }
            }

            // Save proxies to database
            if (proxies.length > 0) {
                // Save in batches of 100
                const batchSize = 100;
                for (let i = 0; i < proxies.length; i += batchSize) {
                    const batch = proxies.slice(i, i + batchSize);
                    await Proxy.insertMany(batch);
                }

                logger.info(`Saved ${proxies.length} free proxies to database`);
            }

            // Test proxies
            await this.testProxies();
        } catch (error) {
            logger.error('Error fetching and saving free proxies:', error);
        }
    }

    async testProxies() {
        // Skip testing if proxies are disabled
        if (process.env.SKIP_PROXIES === 'true') {
            logger.info('Proxy testing skipped - proxy usage is disabled');
            return;
        }

        try {
            logger.info('Testing proxies');

            // Rest of the method remains the same...
        } catch (error) {
            logger.error('Error testing proxies:', error);
        }
    }

    async refreshProxies() {
        // Skip refresh if proxies are disabled
        if (process.env.SKIP_PROXIES === 'true') {
            logger.info('Proxy refresh skipped - proxy usage is disabled');
            this.lastRefresh = Date.now(); // Prevent further refresh attempts
            return;
        }

        try {
            // Find all active proxies
            const proxies = await Proxy.find({ status: 'active' });

            // Rest of the method remains the same...
        } catch (error) {
            logger.error('Error refreshing proxies:', error);
            throw error;
        }
    }

    async getProxyForAccount(accountId, region = 'default') {
        // For testing: check if we should skip proxy usage
        if (process.env.SKIP_PROXIES === 'true') {
            logger.info(`Proxy usage disabled - using direct connection for account ${accountId}`);
            return null;
        }

        // Check if we should use local proxy
        if (process.env.USE_LOCAL_PROXY === 'true') {
            const localProxy = {
                host: process.env.LOCAL_PROXY_HOST || '127.0.0.1',
                port: parseInt(process.env.LOCAL_PROXY_PORT || '8080'),
                protocol: process.env.LOCAL_PROXY_PROTOCOL || 'http',
                username: process.env.LOCAL_PROXY_USERNAME,
                password: process.env.LOCAL_PROXY_PASSWORD
            };

            logger.info(`Using local proxy ${localProxy.host}:${localProxy.port} for account ${accountId}`);
            return localProxy;
        }

        // Rest of the original method for database-stored proxies
        try {
            // Check if we need to refresh the proxies
            if (!this.lastRefresh || Date.now() - this.lastRefresh > this.refreshInterval) {
                await this.refreshProxies();
            }

            // If account already has an assigned proxy
            if (this.accountToProxy.has(accountId)) {
                const proxyId = this.accountToProxy.get(accountId);
                return await this.getProxyById(proxyId);
            }

            // Get proxies for the requested region
            const proxies = this.proxyCacheByRegion.get(region) || this.proxyCacheByRegion.get('default') || [];

            if (proxies.length === 0) {
                logger.warn(`No proxies available for region ${region}`);
                return null;
            }

            // Find the least used proxy
            let leastUsedProxy = null;
            let lowestUsage = Infinity;

            for (const proxy of proxies) {
                const usage = this.proxyUsage.get(proxy._id.toString()) || 0;

                if (usage < lowestUsage) {
                    lowestUsage = usage;
                    leastUsedProxy = proxy;
                }
            }

            if (!leastUsedProxy) {
                logger.warn(`Could not find least used proxy for region ${region}`);
                return null;
            }

            // Assign proxy to account
            const proxyId = leastUsedProxy._id.toString();
            this.accountToProxy.set(accountId, proxyId);
            this.proxyUsage.set(proxyId, (this.proxyUsage.get(proxyId) || 0) + 1);

            return leastUsedProxy;
        } catch (error) {
            logger.error(`Error getting proxy for account ${accountId}:`, error);
            return null;
        }
    }

    async getProxyById(proxyId) {
        try {
            // Check the cache first
            for (const proxies of this.proxyCacheByRegion.values()) {
                const proxy = proxies.find(p => p._id.toString() === proxyId);
                if (proxy) {
                    return proxy;
                }
            }

            // If not in cache, fetch from DB
            return await Proxy.findById(proxyId);
        } catch (error) {
            logger.error(`Error getting proxy by ID ${proxyId}:`, error);
            return null;
        }
    }

    async releaseProxyForAccount(accountId) {
        if (this.accountToProxy.has(accountId)) {
            const proxyId = this.accountToProxy.get(accountId);
            this.accountToProxy.delete(accountId);

            // Decrement usage
            if (this.proxyUsage.has(proxyId)) {
                const usage = this.proxyUsage.get(proxyId);
                if (usage > 1) {
                    this.proxyUsage.set(proxyId, usage - 1);
                } else {
                    this.proxyUsage.delete(proxyId);
                }
            }

            logger.debug(`Released proxy ${proxyId} for account ${accountId}`);
        }
    }

    async reportProxyIssue(proxyId, issue) {
        try {
            // Update proxy in DB
            await Proxy.findByIdAndUpdate(proxyId, {
                $inc: { issueCount: 1 },
                $push: {
                    issues: {
                        timestamp: new Date(),
                        description: issue
                    }
                }
            });

            // If too many issues, mark as problematic
            const proxy = await Proxy.findById(proxyId);

            if (proxy && proxy.issueCount >= 5) {
                await Proxy.findByIdAndUpdate(proxyId, {
                    $set: { status: 'problematic' }
                });

                // Remove from cache
                for (const [region, proxies] of this.proxyCacheByRegion.entries()) {
                    const index = proxies.findIndex(p => p._id.toString() === proxyId);
                    if (index !== -1) {
                        proxies.splice(index, 1);
                    }
                }

                logger.warn(`Marked proxy ${proxyId} as problematic due to multiple issues`);
            }
        } catch (error) {
            logger.error(`Error reporting issue for proxy ${proxyId}:`, error);
        }
    }

    async getProxyCount() {
        const total = await Proxy.countDocuments();
        const active = await Proxy.countDocuments({ status: 'active' });

        return {
            total,
            active
        };
    }
}

module.exports = new LocalProxyManager();