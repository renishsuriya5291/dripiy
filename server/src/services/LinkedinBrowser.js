// Enhanced LinkedInBrowser.js with improved profile visiting capabilities
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const mongoose = require('mongoose');
const path = require("path");
const fs = require('fs');
const readline = require('readline');
const logger = require('../utils/logger');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Apply stealth plugin
puppeteer.use(StealthPlugin());

// Import your LinkedInAccount model
const LinkedInAccount = require('../models/LinkedInAccount');

class LinkedInBrowser {
    constructor() {
        this.browser = null;
        this.page = null;
        this.account = null;

        // Always use headless mode in production (remove command line check)
        this.isHeadless = true;

        this.screenshotsDir = path.join(__dirname, 'screenshots');

        // Create screenshots directory if it doesn't exist
        if (!fs.existsSync(this.screenshotsDir)) {
            fs.mkdirSync(this.screenshotsDir, { recursive: true });
        }

        // Create readline interface for user input (only used in non-headless mode)
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        // Set default values for retry configurations
        this.maxProfileVisitRetries = 3;
        this.retryDelayMin = 3000; // 3 seconds
        this.retryDelayMax = 8000; // 8 seconds

        // Flag to enable detailed logging
        this.debugMode = process.env.DEBUG_MODE === 'true';
    }

    /**
     * Wait for user to press enter
     */
    waitForInput(message) {
        return new Promise((resolve) => {
            this.rl.question(`\n${message}\nPress Enter to continue...`, () => {
                resolve();
            });
        });
    }

    /**
     * Enhanced logging with debug mode support
     */
    log(message, isDebug = false) {
        if (isDebug && !this.debugMode) return;

        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${message}`);
    }

    /**
     * Enhanced error logging
     */
    logError(message, error) {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] 🔴 ERROR: ${message}`);
        if (error) {
            console.error(`${error.message}`);
            if (this.debugMode) {
                console.error(error.stack);
            }
        }
    }

    async checkConnectionStatus() {
        try {
            this.log('Checking current connection status...');

            // Look for indicators that connection is pending or already connected
            const connectionStatusSelectors = [
                '.pvs-profile-actions__action:has-text("Pending")',
                'button:has-text("Pending")',
                'span:has-text("Pending")',
                '.pvs-profile-actions__action:has-text("Message")',
                'button:has-text("Message")'
            ];

            const statusElement = await this.findElementWithSelectors(connectionStatusSelectors);
            if (statusElement) {
                const statusText = await this.page.evaluate(el => el.textContent.trim(), statusElement);

                if (statusText.includes('Pending')) {
                    this.log('Connection request already pending');
                    return { status: 'pending', message: 'Connection request already pending' };
                } else if (statusText.includes('Message')) {
                    this.log('Already connected with this person');
                    return { status: 'connected', message: 'Already connected with this person' };
                }
            }

            this.log('Not connected yet - can proceed with connection request');
            return { status: 'not_connected', message: 'Not connected yet' };
        } catch (error) {
            this.logError('Error checking connection status:', error);
            return { status: 'unknown', message: 'Could not determine connection status' };
        }
    }

    /**
     * Sleep for a random amount of time
     */
    async randomSleep(min, max) {
        const sleep = Math.floor(Math.random() * (max - min + 1)) + min;
        this.log(`Sleeping for ${sleep}ms...`, true);
        await new Promise(resolve => setTimeout(resolve, sleep));
    }

    /**
     * Extract LinkedIn username from profile URL with improved validation
     */
    extractLinkedInUsername(url) {
        if (!url) return null;

        try {
            // Handle various URL formats
            let cleanUrl = url.trim();

            // Remove query parameters and fragments
            cleanUrl = cleanUrl.split('?')[0].split('#')[0];

            // Remove trailing slashes
            cleanUrl = cleanUrl.replace(/\/+$/, '');

            // Extract username
            const match = cleanUrl.match(/linkedin\.com\/in\/([^\/]+)/i);
            return match ? match[1] : null;
        } catch (error) {
            this.logError('Error extracting LinkedIn username:', error);
            return null;
        }
    }

    /**
     * Validate and normalize LinkedIn profile URL
     */
    normalizeProfileUrl(url) {
        if (!url) throw new Error('Profile URL is required');

        let normalizedUrl = url.trim();

        // Add https:// if missing
        if (!normalizedUrl.startsWith('http')) {
            normalizedUrl = `https://${normalizedUrl}`;
        }

        // Ensure linkedin.com domain is present
        if (!normalizedUrl.includes('linkedin.com')) {
            throw new Error('Invalid LinkedIn URL');
        }

        // Remove query parameters and ensure path ends with /in/username format
        const urlObj = new URL(normalizedUrl);
        if (!urlObj.pathname.includes('/in/')) {
            throw new Error('Invalid LinkedIn profile URL format - must include /in/username');
        }

        // Remove query params
        urlObj.search = '';

        // Get the normalized URL
        normalizedUrl = urlObj.toString();

        // Remove trailing slash if present
        if (normalizedUrl.endsWith('/')) {
            normalizedUrl = normalizedUrl.slice(0, -1);
        }

        this.log(`Normalized URL: ${normalizedUrl}`, true);
        return normalizedUrl;
    }

    /**
     * Find an element with multiple selectors with better error handling
     */
    async findElementWithSelectors(selectors, timeout = 3000) {
        for (const selector of selectors) {
            try {
                // Check if element exists
                const exists = await this.page.evaluate((sel) => {
                    return !!document.querySelector(sel);
                }, selector);

                if (exists) {
                    this.log(`Element with selector ${selector} exists on page`, true);

                    // Now wait for it to be visible
                    const element = await this.page.waitForSelector(selector, {
                        timeout,
                        visible: true
                    });

                    if (element) {
                        this.log(`Found element with selector: ${selector}`, true);

                        // Verify it's clickable
                        const isClickable = await this.page.evaluate((sel) => {
                            const el = document.querySelector(sel);
                            if (!el) return false;

                            // Check visibility and other properties
                            const rect = el.getBoundingClientRect();
                            const style = window.getComputedStyle(el);

                            return rect.width > 0 &&
                                rect.height > 0 &&
                                style.visibility !== 'hidden' &&
                                style.display !== 'none' &&
                                style.pointerEvents !== 'none';
                        }, selector);

                        if (isClickable) {
                            return element;
                        } else {
                            this.log(`Element with selector ${selector} is not clickable`, true);
                        }
                    }
                }
            } catch (error) {
                // Continue to the next selector
                this.log(`Selector ${selector} not found: ${error.message}`, true);
            }
        }

        return null;
    }

    /**
     * Attempt to navigate to a URL with retries
     */
    async navigateWithRetry(url, options = {}, maxRetries = 3) {
        const defaultOptions = {
            waitUntil: 'domcontentloaded', // Changed from networkidle2 to be less strict
            timeout: 30000 // Reduced timeout
        };

        const mergedOptions = { ...defaultOptions, ...options };

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                this.log(`Navigation attempt ${attempt} to ${url}`);
                await this.page.goto(url, mergedOptions);

                // Check if page loaded enough to be usable
                const bodyContent = await this.page.evaluate(() => {
                    return document.body ? document.body.innerHTML.length : 0;
                });

                if (bodyContent > 1000) { // Arbitrary threshold to check if page has content
                    this.log(`Successfully navigated to ${url} on attempt ${attempt}`);
                    return true;
                }

                this.log(`Page loaded but seems incomplete (${bodyContent} bytes). Retrying...`);
                await this.randomSleep(3000, 5000); // Wait before retry

            } catch (error) {
                this.log(`Navigation attempt ${attempt} failed: ${error.message}`);

                if (attempt === maxRetries) {
                    this.logError(`Failed all ${maxRetries} navigation attempts to ${url}`, error);
                    return false;
                }

                await this.randomSleep(5000, 8000); // Increasing wait time between retries
            }
        }

        return false;
    }

    async saveCookies() {
        if (!this.page || !this.account) return;

        try {
            const cookies = await this.page.cookies();
            this.account.sessionData = JSON.stringify(cookies);
            this.account.lastUsed = new Date();
            await this.account.save();
            this.log('💾 Saved updated cookies for account', this.account.email);
        } catch (error) {
            this.logError('Error saving cookies:', error);
        }
    }

    /**
     * Initialize the browser and set up configurations
     */
    async initialize() {
        try {
            this.log('🚀 Initializing LinkedIn browser in headless mode...');

            // Connect to MongoDB
            await mongoose.connect(process.env.MONGO_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
            this.log('📊 Connected to MongoDB');

            // Get first active LinkedIn account
            this.account = await LinkedInAccount.findOne({ status: 'active' });
            if (!this.account) {
                throw new Error('❌ No active LinkedIn account found');
            }
            this.log(`👤 Using LinkedIn account: ${this.account.email}`);

            // Configure browser launch options with enhanced stealth settings
            const launchOptions = {
                headless: 'new', // Always use new headless mode
                defaultViewport: null,
                args: [
                    '--window-size=1920,1080',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-notifications',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process',
                    '--disable-blink-features=AutomationControlled',
                    // These additional flags help with headless mode reliability
                    '--disable-features=IsolateOrigins',
                    '--disable-features=BlockInsecurePrivateNetworkRequests',
                    '--disable-features=TrustTokens',
                    '--disable-features=RuntimeSiteIsolation',
                    // Proxy server settings can be added here if needed
                ],
                ignoreDefaultArgs: ['--enable-automation'],
            };

            this.log('🌐 Launching browser...');
            this.browser = await puppeteer.launch(launchOptions);
            this.page = await this.browser.newPage();

            // Set longer timeout for navigation
            this.page.setDefaultNavigationTimeout(60000);

            // Set up request interception
            await this.setupRequestInterception();

            // Set a realistic user agent
            await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');

            // Add realistic browser fingerprinting
            await this.setupBrowserFingerprinting();

            // Setup console and dialog monitoring
            this.setupPageListeners();

            // Load cookies from account
            this.log('🍪 Loading LinkedIn session cookies...');
            if (!this.account.sessionData) {
                throw new Error('❌ No session data found for account - please run in visible mode first to save cookies');
            }

            try {
                const cookies = JSON.parse(this.account.sessionData);
                this.log(`Found ${cookies.length} cookies`);
                await this.page.setCookie(...cookies);
            } catch (error) {
                throw new Error(`❌ Failed to parse session cookies: ${error.message}`);
            }

            // First visit the LinkedIn homepage
            this.log('📄 Visiting LinkedIn homepage...');
            const homeNavSuccess = await this.navigateWithRetry('https://www.linkedin.com/');
            if (!homeNavSuccess) {
                throw new Error('❌ Failed to navigate to LinkedIn homepage');
            }

            await this.randomSleep(2000, 3000);

            // Check if we're redirected to login page
            if (this.page.url().includes('/login')) {
                this.logError('❌ Redirected to login page - session cookies are invalid');

                // We're in headless mode, so we need to throw an error
                throw new Error('LinkedIn session expired. Please run in visible mode first to refresh cookies.');
            }

            // Check login status by visiting feed page
            this.log('📰 Visiting LinkedIn feed to verify login...');
            const feedNavSuccess = await this.navigateWithRetry('https://www.linkedin.com/feed/');
            if (!feedNavSuccess) {
                throw new Error('❌ Failed to navigate to LinkedIn feed page');
            }

            await this.randomSleep(2000, 3000);
            this.log('✅ Successfully logged into LinkedIn');

            return true;
        } catch (error) {
            this.logError(`Error during initialization:`, error);

            // If browser was created, take a screenshot of the error state
            if (this.page) {
                await this.page.screenshot({
                    path: path.join(this.screenshotsDir, `init-error-${Date.now()}.png`),
                    fullPage: true
                });
            }

            return false;
        }
    }

    /**
     * Set up request interception for the browser
     */
    async setupRequestInterception() {
        await this.page.setRequestInterception(true);
        this.page.on('request', (request) => {
            // Allow all essential navigation and document requests
            const resourceType = request.resourceType();
            const url = request.url().toLowerCase();

            // Critical resources that must be allowed
            if (resourceType === 'document' || resourceType === 'script' || resourceType === 'xhr' || resourceType === 'fetch') {
                request.continue();
                return;
            }

            // Allow all LinkedIn resources
            if (url.includes('linkedin.com') || url.includes('licdn.com')) {
                request.continue();
                return;
            }

            // Block known tracking/analytics resources to reduce load
            const blockedResources = [
                'googletagmanager',
                'google-analytics',
                'doubleclick',
                'facebook.net',
                'amplitude',
                'mixpanel',
                'segment.io'
            ];

            if (blockedResources.some(resource => url.includes(resource))) {
                request.abort();
                return;
            }

            // Allow all other requests - less aggressive blocking
            request.continue();
        });
    }

    /**
     * Set up browser fingerprinting to avoid detection
     */
    async setupBrowserFingerprinting() {
        await this.page.evaluateOnNewDocument(() => {
            // Override the `navigator.webdriver` property
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });

            // Override user agent
            window.navigator.chrome = {
                runtime: {},
            };

            // Add language plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [
                    {
                        0: {
                            type: 'application/pdf',
                            suffixes: 'pdf',
                            description: 'Portable Document Format',
                            enabledPlugin: Plugin,
                        },
                        name: 'Chrome PDF Plugin',
                        filename: 'internal-pdf-viewer',
                        description: 'Portable Document Format',
                        length: 1,
                    },
                    {
                        0: {
                            type: 'application/pdf',
                            suffixes: 'pdf',
                            description: 'Portable Document Format',
                            enabledPlugin: Plugin,
                        },
                        name: 'Chrome PDF Viewer',
                        filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
                        description: 'Portable Document Format',
                        length: 1,
                    },
                ],
            });

            // Add fake languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en', 'es'],
            });
        });
    }

    /**
     * Set up page event listeners
     */
    setupPageListeners() {
        this.page.on('console', msg => {
            const text = msg.text();
            // Filter out noisy messages
            if (!text.includes('Failed to load resource: net::ERR_FAILED')) {
                this.log(`BROWSER CONSOLE: ${text}`, true);
            }
        });

        this.page.on('dialog', async dialog => {
            this.log(`DIALOG: ${dialog.message()}`);
            await dialog.dismiss();
        });
    }

    /**
     * Enhanced profile visit method with multiple retries and comprehensive validation
     */
    async visitProfile(profileUrl) {
        try {
            logger.info(`Visiting LinkedIn profile: ${profileUrl}`);

            // Normalize and validate the URL
            let validatedUrl = profileUrl;
            if (!validatedUrl.startsWith('http')) {
                validatedUrl = `https://${validatedUrl}`;
            }

            // Navigate to the profile with shorter timeout
            await this.page.goto(validatedUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 15000 // 15 seconds max
            });

            // Wait a bit for dynamic content - using setTimeout instead of waitForTimeout
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Check if redirected to login page
            const currentUrl = this.page.url();
            if (currentUrl.includes('/login')) {
                logger.error('Redirected to LinkedIn login page - session expired');
                return false;
            }

            // Simple validation - check if we're still on LinkedIn
            const isValid = await this.page.evaluate(() => {
                return window.location.hostname.includes('linkedin.com');
            });

            if (!isValid) {
                logger.error(`Not on LinkedIn website after navigation to ${validatedUrl}`);
                return false;
            }

            // Add some random scrolling to appear more human-like
            await this.page.evaluate(() => {
                window.scrollBy(0, 300);
                setTimeout(() => window.scrollBy(0, 200), 500);
                setTimeout(() => window.scrollBy(0, 100), 1000);
            });

            // Wait a bit longer to simulate viewing the profile - using setTimeout
            await new Promise(resolve => setTimeout(resolve, 2000));

            logger.info(`Successfully visited profile: ${validatedUrl}`);
            return true;
        } catch (error) {
            logger.error(`Error visiting profile ${profileUrl}:`, error);
            return false;
        }
    }

    /**
     * Simplified profile validation that's more tolerant of different LinkedIn UI versions
     */
    async simpleProfileValidation() {
        try {
            return await this.page.evaluate(() => {
                // 1. Check if we're on a LinkedIn page
                if (!window.location.hostname.includes('linkedin.com')) {
                    return false;
                }

                // 2. Check if the URL contains '/in/' (profile pattern)
                const isProfileUrl = window.location.pathname.includes('/in/');

                // 3. Check for minimum page content
                const pageSize = document.body.innerHTML.length;
                const hasAdequateContent = pageSize > 5000;

                // 4. Check for profile indicators
                const hasProfileHeaderSection =
                    !!document.querySelector('h1') ||
                    !!document.querySelector('.pv-top-card') ||
                    !!document.querySelector('.artdeco-card');

                // 5. Check for common text patterns
                const bodyText = document.body.innerText;
                const hasProfileKeywords =
                    bodyText.includes('Experience') ||
                    bodyText.includes('Education') ||
                    bodyText.includes('Skills') ||
                    bodyText.includes('About') ||
                    bodyText.includes('connections');

                // Make the validation more flexible - only require 2 out of 4 conditions
                const validCriteria = [
                    isProfileUrl,
                    hasAdequateContent,
                    hasProfileHeaderSection,
                    hasProfileKeywords
                ].filter(Boolean).length;

                return validCriteria >= 2;
            });
        } catch (error) {
            this.logError('Error in simple profile validation:', error);
            return false;
        }
    }

    /**
     * Comprehensive profile page validation
     */
    async validateProfilePage(expectedUrl) {
        try {
            // Get current URL and compare with expected URL
            const currentUrl = this.page.url();
            this.log(`Validating profile page. Current URL: ${currentUrl}`);

            // If redirected to login page, profile visit failed
            if (currentUrl.includes('/login')) {
                this.log('❌ Redirected to login page - session expired');
                return false;
            }

            // Check for LinkedIn Challenge page (security check)
            const isChallengePresent = await this.page.evaluate(() => {
                return document.body.innerText.includes('Security Verification') ||
                    document.body.innerText.includes('Security Challenge') ||
                    document.body.innerText.includes('CAPTCHA');
            });

            if (isChallengePresent) {
                this.log('❌ LinkedIn security challenge detected');
                return false;
            }

            // Multiple validation checks
            const validationResults = await this.page.evaluate(() => {
                // 1. URL pattern check
                const isProfileUrl = window.location.href.includes('/in/');

                // 2. Profile elements check
                const profileElementsPresent = {
                    profileSection: !!document.querySelector('.pv-top-card, .artdeco-card, .profile-view-grid'),
                    profileImage: !!document.querySelector('.pv-top-card__photo, .profile-picture, [data-test-id="profile-photo"]'),
                    profileName: !!document.querySelector('.text-heading-xlarge, .pv-top-card__name, h1.GENqEgYBNThhcWfOazjnJkqhXaXbfXy'),
                    infoSection: !!document.querySelector('.profile-info, .profile-content, [data-test-id="profile-content"]')
                };

                // 3. Content keyword check
                const profileContentKeywords = [
                    'Experience',
                    'Education',
                    'Skills',
                    'About',
                    'Contact',
                    'connections'
                ];

                const bodyText = document.body.innerText;
                const hasProfileKeywords = profileContentKeywords.some(keyword =>
                    bodyText.includes(keyword)
                );

                // 4. Page size check
                const pageSize = document.body.innerHTML.length;
                const hasAdequateContent = pageSize > 10000;

                return {
                    isProfileUrl,
                    profileElementsPresent,
                    hasProfileKeywords,
                    hasAdequateContent,
                    pageSize
                };
            });

            this.log(`Profile validation results: ${JSON.stringify(validationResults, null, 2)}`, true);

            // Decision logic based on multiple factors
            const elementsPresentCount = Object.values(validationResults.profileElementsPresent)
                .filter(Boolean).length;

            const isValid =
                validationResults.isProfileUrl &&
                elementsPresentCount >= 2 &&
                validationResults.hasProfileKeywords &&
                validationResults.hasAdequateContent;

            if (isValid) {
                this.log('✅ Profile page validation passed');
                return true;
            } else {
                this.log('❌ Profile page validation failed');
                return false;
            }
        } catch (error) {
            this.logError('Error validating profile page:', error);
            return false;
        }
    }

    /**
     * Cleanup resources
     */
    async cleanup(keepBrowserOpen = false) {
        try {
            this.log('Cleaning up resources...');

            // Save cookies before closing
            if (this.page && this.account) {
                const currentCookies = await this.page.cookies();
                this.account.sessionData = JSON.stringify(currentCookies);
                this.account.lastUsed = new Date();
                await this.account.save();
                this.log(`Updated session cookies for account ${this.account._id}`);
            }

            // Close MongoDB connection
            if (mongoose.connection.readyState) {
                await mongoose.connection.close();
                this.log('Closed MongoDB connection');
            }

            // Close readline interface
            if (this.rl) {
                this.rl.close();
            }

            // Close browser if requested
            if (!keepBrowserOpen && this.browser) {
                await this.browser.close();
                this.log('Browser closed');
            } else if (this.browser) {
                this.log('Browser kept open for inspection. Press Ctrl+C to exit.');
            }
        } catch (error) {
            this.logError(`Error during cleanup:`, error);
        }
    }

    /**
     * Visit a profile and send a connection request
     */
    async visitAndConnect(profileUrl) {
        try {
            // Initialize the browser if not already done
            if (!this.browser || !this.page) {
                const initialized = await this.initialize();
                if (!initialized) {
                    throw new Error('Failed to initialize LinkedIn browser');
                }
            }

            // Visit the profile
            const visitSuccess = await this.visitProfile(profileUrl);
            if (!visitSuccess) {
                throw new Error(`Failed to visit profile ${profileUrl}`);
            }

            // Send a connection request
            const connectionSent = await this.sendConnectionRequest();

            return {
                success: connectionSent,
                message: connectionSent ? 'Connection request sent successfully' : 'Failed to send connection request'
            };
        } catch (error) {
            this.logError(`Error in visitAndConnect:`, error);
            return {
                success: false,
                message: `Error: ${error.message}`
            };
        }
    }

    async sendConnectionRequest(accountId, profileUrl, message = null) {
        try {
            // Check usage limits
            if (!this.trackUsage(accountId, 'sendConnectionRequest')) {
                throw new Error('Daily connection request limit reached for this account');
            }

            logger.info(`Sending connection request to ${profileUrl} from account ${accountId}`);

            // Execute connection request using the worker pool
            const result = await browserWorkerPool.executeAction(accountId, async (browser) => {
                // First, visit the profile
                const visitSuccess = await browser.visitProfile(profileUrl);
                if (!visitSuccess) {
                    throw new Error(`Failed to visit profile ${profileUrl}`);
                }

                // Wait for page to be fully loaded
                await browser.randomSleep(3000, 5000);

                // Take a debug screenshot
                if (browser.debugMode) {
                    await browser.page.screenshot({
                        path: `${browser.screenshotsDir}/before-connection-request-${Date.now()}.png`,
                        fullPage: false
                    });
                }

                // Log page HTML for debugging if in debug mode
                if (browser.debugMode) {
                    const html = await browser.page.content();
                    logger.debug(`Page HTML length: ${html.length} characters`);

                    // Log DOM structure for debugging
                    await this.logDOMStructure(browser);
                }

                // Check connection status using the improved method
                const connectionStatus = await this.checkConnectionStatus(browser);
                logger.info(`Connection status: ${connectionStatus.status} - ${connectionStatus.message}`);

                if (connectionStatus.status === 'connected') {
                    return {
                        success: true,
                        action: 'connection_status_checked',
                        message: 'Already connected with this person'
                    };
                } else if (connectionStatus.status === 'pending') {
                    return {
                        success: true,
                        action: 'connection_status_checked',
                        message: 'Connection request already pending'
                    };
                }

                // Try to send a connection request
                // First check if we need to click the "More" dropdown
                let moreDropdownClicked = false;

                if (connectionStatus.status === 'more_dropdown' || connectionStatus.status === 'unknown') {
                    logger.info('Attempting to open More dropdown');
                    moreDropdownClicked = await this.findAndClickElementByText(browser, 'More');

                    if (!moreDropdownClicked) {
                        logger.warn('Could not find More dropdown - trying alternative approaches');

                        // Take a debug screenshot
                        if (browser.debugMode) {
                            await browser.page.screenshot({
                                path: `${browser.screenshotsDir}/more-dropdown-not-found-${Date.now()}.png`,
                                fullPage: false
                            });
                        }

                        // Try clicking by selector directly
                        moreDropdownClicked = await browser.page.evaluate(() => {
                            const moreButton = document.querySelector('.artdeco-dropdown__trigger, button[aria-label="More actions"]');
                            if (moreButton) {
                                moreButton.click();
                                return true;
                            }
                            return false;
                        });
                    }

                    if (moreDropdownClicked) {
                        // Wait for dropdown to appear
                        await browser.randomSleep(1000, 2000);

                        // Take a debug screenshot
                        if (browser.debugMode) {
                            await browser.page.screenshot({
                                path: `${browser.screenshotsDir}/more-dropdown-opened-${Date.now()}.png`,
                                fullPage: false
                            });
                        }
                    }
                }

                // Now try to find and click the Connect button (either in dropdown or directly on page)
                logger.info('Attempting to click Connect button');
                const connectButtonClicked = await this.findAndClickElementByText(browser, 'Connect');

                if (!connectButtonClicked) {
                    // If More was clicked but Connect not found, try to click directly on the Connect element in dropdown
                    if (moreDropdownClicked) {
                        logger.warn('Could not find Connect in dropdown - trying direct DOM access');

                        const dropdownConnectClicked = await browser.page.evaluate(() => {
                            // Try to find the dropdown content
                            const dropdown = document.querySelector('.artdeco-dropdown__content-inner');
                            if (!dropdown) return false;

                            // Look for Connect item in dropdown
                            const items = dropdown.querySelectorAll('li');
                            for (const item of items) {
                                if (item.innerText.toLowerCase().includes('connect')) {
                                    // Find clickable element
                                    const clickable = item.querySelector('[role="button"], button, a, div');
                                    if (clickable) {
                                        clickable.click();
                                        return true;
                                    } else {
                                        // Try clicking the item itself
                                        item.click();
                                        return true;
                                    }
                                }
                            }
                            return false;
                        });

                        if (!dropdownConnectClicked) {
                            // Take a debug screenshot
                            if (browser.debugMode) {
                                await browser.page.screenshot({
                                    path: `${browser.screenshotsDir}/connect-not-found-in-dropdown-${Date.now()}.png`,
                                    fullPage: false
                                });
                            }

                            throw new Error('Could not find Connect button after opening More dropdown');
                        }
                    } else {
                        // Take a debug screenshot
                        if (browser.debugMode) {
                            await browser.page.screenshot({
                                path: `${browser.screenshotsDir}/connect-button-not-found-${Date.now()}.png`,
                                fullPage: false
                            });
                        }

                        throw new Error('Could not find Connect button on page');
                    }
                }

                // Wait for connection dialog to appear
                await browser.randomSleep(1000, 2000);

                // Take a debug screenshot
                if (browser.debugMode) {
                    await browser.page.screenshot({
                        path: `${browser.screenshotsDir}/after-connect-click-${Date.now()}.png`,
                        fullPage: false
                    });
                }

                // Add custom message if provided
                if (message) {
                    logger.info('Attempting to add custom connection message');

                    // Click "Add a note" button if it exists
                    const addNoteClicked = await this.findAndClickElementByText(browser, 'Add a note');

                    if (addNoteClicked) {
                        // Wait for textarea to appear
                        await browser.randomSleep(1000, 2000);

                        // Type the message
                        const messageTyped = await browser.page.evaluate((customMessage) => {
                            // Find textarea
                            const textarea = document.querySelector('textarea');
                            if (textarea) {
                                textarea.value = customMessage;
                                // Trigger input event to ensure LinkedIn registers the text
                                const event = new Event('input', { bubbles: true });
                                textarea.dispatchEvent(event);
                                return true;
                            }
                            return false;
                        }, message);

                        if (!messageTyped) {
                            logger.warn('Could not type custom message - continuing without message');
                        }
                    } else {
                        logger.warn('Could not find "Add a note" button - continuing without message');
                    }
                }

                // Click final Send button
                await browser.randomSleep(1000, 2000);
                logger.info('Attempting to click Send button');

                const sendClicked = await this.findAndClickElementByText(browser, 'Send');

                if (!sendClicked) {
                    // Try finding any button that looks like a send button
                    const anySendButtonClicked = await browser.page.evaluate(() => {
                        // Try various send-like buttons
                        const sendButtons = Array.from(document.querySelectorAll('button'))
                            .filter(btn =>
                                btn.innerText.toLowerCase().includes('send') ||
                                btn.innerText.toLowerCase().includes('done') ||
                                btn.innerText.toLowerCase().includes('submit')
                            );

                        if (sendButtons.length > 0) {
                            sendButtons[0].click();
                            return true;
                        }

                        // If no obvious send button, try any primary button
                        const primaryButtons = Array.from(document.querySelectorAll('.artdeco-button--primary'));
                        if (primaryButtons.length > 0) {
                            primaryButtons[0].click();
                            return true;
                        }

                        return false;
                    });

                    if (!anySendButtonClicked) {
                        // Take a debug screenshot
                        if (browser.debugMode) {
                            await browser.page.screenshot({
                                path: `${browser.screenshotsDir}/send-button-not-found-${Date.now()}.png`,
                                fullPage: false
                            });
                        }

                        throw new Error('Could not find Send button to complete connection request');
                    }
                }

                // Wait for request to be processed
                await browser.randomSleep(2000, 4000);

                // Take a final debug screenshot
                if (browser.debugMode) {
                    await browser.page.screenshot({
                        path: `${browser.screenshotsDir}/connection-request-sent-${Date.now()}.png`,
                        fullPage: false
                    });
                }

                return {
                    success: true,
                    action: 'connection_request_sent',
                    message: 'Connection request sent successfully'
                };
            });

            // Respect rate limits with a delay before returning
            await new Promise(resolve => setTimeout(resolve, this.getRandomDelay('sendConnectionRequest')));

            return result;
        } catch (error) {
            logger.error(`Error in sendConnectionRequest for ${profileUrl}:`, error);
            throw error;
        }
    }

    async safeClick(selector, options = {}) {
        const {
            timeout = 5000,
            waitAfterClick = 1000,
            retries = 3,
            visibleOnly = true,
            logPrefix = 'Click'
        } = options;

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                // Wait for selector
                let element;

                if (typeof selector === 'string') {
                    // For string selectors
                    try {
                        element = await this.page.waitForSelector(selector, {
                            timeout,
                            visible: visibleOnly
                        });
                    } catch (error) {
                        this.log(`${logPrefix}: Selector not found: ${selector} (attempt ${attempt}/${retries})`, true);

                        if (attempt === retries) throw error;
                        await this.randomSleep(1000, 2000);
                        continue;
                    }
                } else if (typeof selector === 'function') {
                    // For predicate function selectors
                    try {
                        element = await this.page.waitForFunction(selector, { timeout });
                    } catch (error) {
                        this.log(`${logPrefix}: Predicate element not found (attempt ${attempt}/${retries})`, true);

                        if (attempt === retries) throw error;
                        await this.randomSleep(1000, 2000);
                        continue;
                    }
                } else {
                    throw new Error('Invalid selector: must be string or function');
                }

                // Before clicking, make sure element is still valid
                const isVisible = await this.page.evaluate(el => {
                    if (!el) return false;

                    const rect = el.getBoundingClientRect();
                    const style = window.getComputedStyle(el);
                    return rect.width > 0 &&
                        rect.height > 0 &&
                        style.visibility !== 'hidden' &&
                        style.display !== 'none' &&
                        el.offsetParent !== null;
                }, element);

                if (!isVisible) {
                    this.log(`${logPrefix}: Element found but not visible (attempt ${attempt}/${retries})`, true);

                    if (attempt === retries) throw new Error('Element not visible');
                    await this.randomSleep(1000, 2000);
                    continue;
                }

                // Click with retry if needed
                try {
                    await element.click();
                    this.log(`${logPrefix}: Successfully clicked element`, true);

                    // Wait after click to let page react
                    await this.randomSleep(waitAfterClick, waitAfterClick * 1.5);
                    return true;
                } catch (clickError) {
                    this.log(`${logPrefix}: Click failed: ${clickError.message} (attempt ${attempt}/${retries})`, true);

                    // Try using evaluate as a fallback
                    try {
                        await this.page.evaluate(el => el.click(), element);
                        this.log(`${logPrefix}: Successfully clicked element via evaluate fallback`, true);

                        // Wait after click
                        await this.randomSleep(waitAfterClick, waitAfterClick * 1.5);
                        return true;
                    } catch (evalClickError) {
                        this.log(`${logPrefix}: Evaluate click also failed: ${evalClickError.message}`, true);

                        if (attempt === retries) throw clickError;
                        await this.randomSleep(1000, 2000);
                        continue;
                    }
                }
            } catch (error) {
                if (attempt === retries) {
                    this.logError(`${logPrefix}: Failed after ${retries} attempts:`, error);
                    return false;
                }

                // Wait before retry
                await this.randomSleep(1000, 2000);
            }
        }

        return false;
    }
}

// Export the LinkedIn browser
module.exports = LinkedInBrowser;