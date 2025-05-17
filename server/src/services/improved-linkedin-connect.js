// improved-linkedin-connect.js
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const mongoose = require('mongoose');
const readline = require('readline');
const path = require("path");
const fs = require('fs');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Apply stealth plugin
puppeteer.use(StealthPlugin());

// Import your LinkedInAccount model
const LinkedInAccount = require('../models/LinkedInAccount');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Wait for user to press enter
 */
const waitForInput = (message) => {
  return new Promise((resolve) => {
    rl.question(`\n${message}\nPress Enter to continue...`, () => {
      resolve();
    });
  });
};

/**
 * Sleep for a random amount of time
 */
const randomSleep = async (min, max) => {
  const sleep = Math.floor(Math.random() * (max - min + 1)) + min;
  console.log(`Sleeping for ${sleep}ms...`);
  await new Promise(resolve => setTimeout(resolve, sleep));
};

/**
 * Extract LinkedIn username from profile URL
 */
const extractLinkedInUsername = (url) => {
  const match = url.match(/linkedin\.com\/in\/([^\/]+)/i);
  return match ? match[1].replace(/\/$/, '') : null;
};

/**
 * Find an element with multiple selectors with better error handling
 */
const findElementWithSelectors = async (page, selectors, timeout = 3000) => {
  for (const selector of selectors) {
    try {
      // Check if element exists
      const exists = await page.evaluate((sel) => {
        return !!document.querySelector(sel);
      }, selector);
      
      if (exists) {
        console.log(`Element with selector ${selector} exists on page`);
        
        // Now wait for it to be visible
        const element = await page.waitForSelector(selector, { 
          timeout,
          visible: true 
        });
        
        if (element) {
          console.log(`Found element with selector: ${selector}`);
          
          // Verify it's clickable
          const isClickable = await page.evaluate((sel) => {
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
            console.log(`Element with selector ${selector} is not clickable`);
          }
        }
      }
    } catch (error) {
      // Continue to the next selector
      console.log(`Selector ${selector} not found: ${error.message}`);
    }
  }
  
  return null;
};

/**
 * Attempt to navigate to a URL with retries
 */
const navigateWithRetry = async (page, url, options = {}, maxRetries = 3) => {
  const defaultOptions = {
    waitUntil: 'domcontentloaded', // Changed from networkidle2 to be less strict
    timeout: 30000 // Reduced timeout
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Navigation attempt ${attempt} to ${url}`);
      await page.goto(url, mergedOptions);
      
      // Check if page loaded enough to be usable
      const bodyContent = await page.evaluate(() => {
        return document.body ? document.body.innerHTML.length : 0;
      });
      
      if (bodyContent > 1000) { // Arbitrary threshold to check if page has content
        console.log(`Successfully navigated to ${url} on attempt ${attempt}`);
        return true;
      }
      
      console.log(`Page loaded but seems incomplete (${bodyContent} bytes). Retrying...`);
      await randomSleep(3000, 5000); // Wait before retry
      
    } catch (error) {
      console.warn(`Navigation attempt ${attempt} failed: ${error.message}`);
      
      if (attempt === maxRetries) {
        console.error(`Failed all ${maxRetries} navigation attempts to ${url}`);
        return false;
      }
      
      await randomSleep(5000, 8000); // Increasing wait time between retries
    }
  }
  
  return false;
};

/**
 * Try several methods to send a connection request
 */
async function tryConnectionMethods(page, screenshotsDir) {
  // Method 1: Click More button first, then Connect from dropdown
  console.log('Method 1: Looking for More button first...');
  
  // More button selectors
  const moreButtonSelectors = [
    'button:has-text("More")',
    'button.artdeco-button:has-text("More")',
    '.artdeco-dropdown__trigger:has-text("More")'
  ];
  
  let moreButton = await findElementWithSelectors(page, moreButtonSelectors);
  if (moreButton) {
    console.log('Found More button, clicking it...');
    await moreButton.click();
    console.log('Clicked More button');
    
    // Important: Wait longer for dropdown to appear
    await randomSleep(3000, 5000);
    await page.screenshot({ path: path.join(screenshotsDir, 'more-button-click.png') });
    
    // Look for Connect in dropdown - EXACTLY as shown in the latest screenshot
    console.log('Looking for Connect option in dropdown...');
    
    // Connect option selectors that match the dropdown item
    const connectOptionSelectors = [
      // Target the specific Connect option in dropdown (from screenshot)
      '.artdeco-dropdown__item:has-text("Connect")',
      'li:has-text("Connect")',
      'div[role="button"]:has-text("Connect")',
      '.artdeco-dropdown__content li div:has-text("Connect")',
      // Icon-based selector
      'li div.display-flex.align-items-center:has(svg[data-test-icon="connect-medium"])'
    ];
    
    const connectOption = await findElementWithSelectors(page, connectOptionSelectors, 5000);
    
    if (connectOption) {
      console.log('Found Connect option in dropdown, clicking it...');
      await connectOption.click();
      console.log('Clicked Connect option in dropdown');
      await randomSleep(2000, 3000);
      await page.screenshot({ path: path.join(screenshotsDir, 'connect-from-dropdown.png') });
      
      // Handle the invitation dialog
      await handleConnectModal(page, screenshotsDir);
      return true;
    } else {
      console.log('Connect option not found in dropdown - trying direct DOM traversal');
      
      // Try using evaluate to find by text content
      try {
        const connected = await page.evaluate(() => {
          // Find all dropdown items
          const dropdownItems = document.querySelectorAll('li div[role="button"], .artdeco-dropdown__item, li div');
          
          // Find the one with Connect text
          for (const item of dropdownItems) {
            if (item.textContent.trim() === 'Connect') {
              console.log('Found Connect by text content, clicking it');
              item.click();
              return true;
            }
          }
          return false;
        });
        
        if (connected) {
          console.log('Successfully clicked Connect via DOM traversal');
          await randomSleep(2000, 3000);
          await page.screenshot({ path: path.join(screenshotsDir, 'connect-via-dom.png') });
          await handleConnectModal(page, screenshotsDir);
          return true;
        }
      } catch (error) {
        console.log('Error in DOM traversal:', error.message);
      }
      
      // If still not found, try clicking based on position in the dropdown
      try {
        const clickedByPosition = await page.evaluate(() => {
          // Find the dropdown menu
          const dropdownMenu = document.querySelector('.artdeco-dropdown__content, [role="menu"]');
          if (!dropdownMenu) return false;
          
          // Get all items in the dropdown
          const menuItems = dropdownMenu.querySelectorAll('li');
          if (!menuItems.length) return false;
          
          // Connect is typically the 5th item (index 4) based on your screenshot
          // But we'll also check a few other positions
          const potentialPositions = [4, 3, 5];
          
          for (const pos of potentialPositions) {
            if (menuItems[pos]) {
              const connectDiv = menuItems[pos].querySelector('div');
              if (connectDiv) {
                connectDiv.click();
                return true;
              }
            }
          }
          return false;
        });
        
        if (clickedByPosition) {
          console.log('Clicked Connect by position in dropdown');
          await randomSleep(2000, 3000);
          await page.screenshot({ path: path.join(screenshotsDir, 'connect-by-position.png') });
          await handleConnectModal(page, screenshotsDir);
          return true;
        }
      } catch (error) {
        console.log('Error clicking by position:', error.message);
      }
      
      // Take screenshot of the dropdown for debugging
      await page.screenshot({ path: path.join(screenshotsDir, 'dropdown-no-connect.png') });
    }
  }
  
  // Method 2: Precise targeting using the dropdown structure
  console.log('Method 2: Attempting to click More and Connect with precise targeting...');
  try {
    const clicked = await page.evaluate(() => {
      // First, click the More button
      const moreButton = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent.trim() === 'More'
      );
      
      if (!moreButton) return false;
      moreButton.click();
      
      // Return a promise to allow time for dropdown to appear
      return new Promise(resolve => {
        setTimeout(() => {
          // Now find the Connect option in the dropdown exactly as in the screenshot
          const items = document.querySelectorAll('li');
          
          for (const item of items) {
            // Look for the item with an SVG and "Connect" text
            if (item.textContent.trim() === 'Connect' || 
                (item.querySelector('svg') && item.textContent.includes('Connect'))) {
              
              // Click the div inside, which is the actual clickable element
              const clickableDiv = item.querySelector('div');
              if (clickableDiv) {
                clickableDiv.click();
                resolve(true);
                return;
              }
              
              // Fallback: click the item itself
              item.click();
              resolve(true);
              return;
            }
          }
          
          resolve(false);
        }, 2000); // Wait for dropdown to appear
      });
    });
    
    if (clicked) {
      console.log('Successfully clicked Connect in Method 2');
      await randomSleep(2000, 3000);
      await page.screenshot({ path: path.join(screenshotsDir, 'method2-connect.png') });
      await handleConnectModal(page, screenshotsDir);
      return true;
    }
  } catch (error) {
    console.log('Error in Method 2:', error.message);
  }
  
  // Method 3: Final fallback - take a screenshot and analyze what's visible
  console.log('Method 3: Final fallback - capturing and analyzing dropdown...');
  try {
    // Click More button again if needed
    const moreButton = await findElementWithSelectors(page, moreButtonSelectors);
    if (moreButton) {
      await moreButton.click();
      await randomSleep(2000, 3000);
      
      // Take a screenshot of the dropdown
      await page.screenshot({ path: path.join(screenshotsDir, 'dropdown-analysis.png') });
      
      // Analyze what's in the dropdown
      const dropdownItems = await page.evaluate(() => {
        const items = document.querySelectorAll('.artdeco-dropdown__content li, [role="menu"] li');
        return Array.from(items).map((item, index) => ({
          index,
          text: item.textContent.trim(),
          hasConnectText: item.textContent.includes('Connect'),
          hasIcon: !!item.querySelector('svg'),
          childrenCount: item.children.length
        }));
      });
      
      console.log('Dropdown items:', JSON.stringify(dropdownItems, null, 2));
      
      // Try clicking the item that most likely contains "Connect"
      const connectItemIndex = dropdownItems.findIndex(item => item.hasConnectText);
      if (connectItemIndex >= 0) {
        const clicked = await page.evaluate((index) => {
          const items = document.querySelectorAll('.artdeco-dropdown__content li, [role="menu"] li');
          if (items[index]) {
            const clickTarget = items[index].querySelector('div') || items[index];
            clickTarget.click();
            return true;
          }
          return false;
        }, connectItemIndex);
        
        if (clicked) {
          console.log(`Clicked item at index ${connectItemIndex} containing Connect`);
          await randomSleep(2000, 3000);
          await page.screenshot({ path: path.join(screenshotsDir, 'connect-by-analysis.png') });
          await handleConnectModal(page, screenshotsDir);
          return true;
        }
      }
    }
  } catch (error) {
    console.log('Error in Method 3:', error.message);
  }
  
  console.log('All connection methods failed');
  return false;
}

/**
 * Extract LinkedIn profile ID from page
 */
async function extractProfileIdFromPage(page) {
  try {
    // Method 1: Extract from URL
    const linkedInId = await page.evaluate(() => {
      // Try to find it in URL
      const match = window.location.href.match(/\/in\/([^\/]+)/);
      if (match) return match[1];
      
      // Try to find it in meta tags
      const metaProfileId = document.querySelector('meta[name="profile-id"]');
      if (metaProfileId) return metaProfileId.getAttribute('content');
      
      // Try to find it in JSON-LD
      const ldJson = document.querySelector('script[type="application/ld+json"]');
      if (ldJson) {
        try {
          const data = JSON.parse(ldJson.textContent);
          if (data.url) {
            const urlMatch = data.url.match(/\/in\/([^\/]+)/);
            if (urlMatch) return urlMatch[1];
          }
        } catch (e) {}
      }
      
      return null;
    });
    
    return linkedInId;
  } catch (error) {
    console.warn(`Error extracting profile ID: ${error.message}`);
    return null;
  }
}

/**
 * Attempt to send connection request via LinkedIn API
 */
async function sendConnectionViaAPI(page, profileId) {
  try {
    // First, get the CSRF token from cookies
    const cookies = await page.cookies();
    const csrfCookie = cookies.find(cookie => cookie.name === 'JSESSIONID');
    
    if (!csrfCookie) {
      console.warn('CSRF token not found in cookies');
      return false;
    }
    
    // Get tracking ID from page if available
    const trackingId = await page.evaluate(() => {
      // Try to find in window object or from data attributes
      if (window.li_track_id) return window.li_track_id;
      
      const trackingElement = document.querySelector('[data-tracking-id]');
      if (trackingElement) return trackingElement.getAttribute('data-tracking-id');
      
      return '';
    });
    
    // Prepare connection request payload
    const connectionPayload = {
      trackingId: trackingId || '',
      invitee: {
        profileId: profileId
      },
      message: 'Hello! I came across your profile and would like to connect. Looking forward to networking with you.',
      trackingCode: ''
    };
    
    // Send the connection request via page.evaluate to use the browser's fetch
    const result = await page.evaluate(async (payload, csrfToken) => {
      try {
        const response = await fetch('https://www.linkedin.com/voyager/api/growth/invite-sending/connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Restli-Protocol-Version': '2.0.0',
            'csrf-token': csrfToken
          },
          body: JSON.stringify(payload),
          credentials: 'include'
        });
        
        if (response.ok) {
          return { success: true };
        } else {
          return { 
            success: false, 
            status: response.status,
            statusText: response.statusText
          };
        }
      } catch (error) {
        return { success: false, error: error.toString() };
      }
    }, connectionPayload, csrfCookie.value);
    
    console.log('API connection request result:', result);
    return result.success;
    
  } catch (error) {
    console.warn(`Error sending connection via API: ${error.message}`);
    return false;
  }
}

/**
 * Handle the connection modal dialog
 */
async function handleConnectModal(page, screenshotsDir) {
  console.log('Looking for connection invitation dialog...');
  await randomSleep(2000, 3000);
  
  // Take screenshot to see the current state
  await page.screenshot({ path: path.join(screenshotsDir, 'invitation-dialog.png') });
  
  // Check if the invitation dialog is present - exactly as shown in Image 3
  const dialogSelectors = [
    'div[role="dialog"]',
    'h2:has-text("Add a note to your invitation?")',
    'button:has-text("Add a note")',
    'button:has-text("Send without a note")'
  ];
  
  const dialogElement = await findElementWithSelectors(page, dialogSelectors, 5000);
  if (!dialogElement) {
    console.log('Invitation dialog not found. May have already sent request or already connected.');
    return;
  }
  
  console.log('Invitation dialog found!');
  
  // Randomly decide whether to add a note (70% chance)
  const addNote = Math.random() < 0.7;
  
  if (addNote) {
    console.log('Will add a personalized note...');
    
    // Click the "Add a note" button - exactly as shown in Image 3
    const addNoteButtonSelectors = [
      'button:has-text("Add a note")',
      'button.artdeco-button:not(.artdeco-button--primary):has-text("Add a note")'
    ];
    
    const addNoteButton = await findElementWithSelectors(page, addNoteButtonSelectors, 5000);
    if (addNoteButton) {
      console.log('Found "Add a note" button, clicking it...');
      await addNoteButton.click();
      console.log('Clicked "Add a note" button');
      await randomSleep(2000, 3000);
      
      // Take screenshot after clicking "Add a note"
      await page.screenshot({ path: path.join(screenshotsDir, 'add-note-clicked.png') });
      
      // Find the textarea - exactly as shown in Image 4
      const textareaSelectors = [
        'textarea',
        'textarea[placeholder*="We know each other"]',
        'textarea[name="message"]',
        'textarea[aria-label*="Add a note"]'
      ];
      
      const textarea = await findElementWithSelectors(page, textareaSelectors, 5000);
      if (textarea) {
        console.log('Found note textarea, typing message...');
        
        // Clear any existing text
        await page.evaluate(() => {
          const textareas = document.querySelectorAll('textarea');
          textareas.forEach(t => t.value = '');
        });
        
        // Add a personalized note
        const noteText = `Hello! I came across your profile and would like to connect. Looking forward to networking with you.`;
        await textarea.type(noteText, { delay: 50 });
        console.log('Added personalized note');
        await randomSleep(2000, 3000);
        await page.screenshot({ path: path.join(screenshotsDir, 'note-added.png') });
        
        // Click the Send button after adding note - from Image 4
        const sendButtonSelectors = [
          'button:has-text("Send")',
          'button.artdeco-button--primary',
          'button[aria-label*="Send now"]'
        ];
        
        const sendButton = await findElementWithSelectors(page, sendButtonSelectors, 5000);
        if (sendButton) {
          console.log('Found Send button, clicking it...');
          await sendButton.click();
          console.log('Clicked Send button after adding note');
          await randomSleep(2000, 3000);
          await page.screenshot({ path: path.join(screenshotsDir, 'after-send-with-note.png') });
          return;
        } else {
          console.log('Send button not found after adding note');
        }
      } else {
        console.log('Textarea for note not found');
      }
    } else {
      console.log('"Add a note" button not found, will try sending without note');
    }
  }
  
  // Send without a note - from Image 3
  console.log('Attempting to send without a note...');
  const sendWithoutNoteSelectors = [
    'button:has-text("Send without a note")',
    'button.artdeco-button--primary',
    'button.artdeco-button:has-text("Send without")'
  ];
  
  const sendWithoutNoteButton = await findElementWithSelectors(page, sendWithoutNoteSelectors, 5000);
  if (sendWithoutNoteButton) {
    console.log('Found "Send without a note" button, clicking it...');
    await sendWithoutNoteButton.click();
    console.log('Clicked "Send without a note" button');
    await randomSleep(2000, 3000);
    await page.screenshot({ path: path.join(screenshotsDir, 'after-send-without-note.png') });
  } else {
    console.log('Could not find any send button');
    
    // Last resort, try any button that might be a send button
    const anyButtonSelectors = [
      'button.artdeco-button--primary',
      'button:has-text("Send")',
      'button[aria-label*="Send"]'
    ];
    
    const anyButton = await findElementWithSelectors(page, anyButtonSelectors);
    if (anyButton) {
      console.log('Found a possible send button as last resort, clicking it...');
      await anyButton.click();
      console.log('Clicked possible send button');
      await randomSleep(2000, 3000);
      await page.screenshot({ path: path.join(screenshotsDir, 'after-send-last-resort.png') });
    } else {
      console.log('No send button found at all');
    }
  }
}

/**
const profileUrl = profileArg || 'https://www.linkedin.com/in/thomas-packer';
 * Main function to send connection request
 */
async function sendConnectionRequest(profileUrl = 'https://www.linkedin.com/in/thomas-packer') {
  let browser = null;
  let page = null;
  
  // Create screenshots directory if it doesn't exist
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    // Get first active LinkedIn account
    const account = await LinkedInAccount.findOne({ status: 'active' });
    if (!account) {
      throw new Error('No active LinkedIn account found');
    }
    console.log(`Using account: ${account._id} (${account.email})`);

    // Check if headless mode is enabled from command line args
    const isHeadless = process.argv.includes('--headless');
    console.log(`Running in ${isHeadless ? 'headless' : 'visible'} mode`);
    
    // Configure browser launch options with enhanced stealth settings
    const launchOptions = {
      headless: isHeadless ? 'new' : false,
      defaultViewport: null,
      args: [
        '--window-size=1920,1080',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-notifications',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-blink-features=AutomationControlled',
        // Additional stealth-related args
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins',
        '--disable-features=BlockInsecurePrivateNetworkRequests',
        '--disable-features=TrustTokens',
        '--disable-features=RuntimeSiteIsolation',
      ],
      ignoreDefaultArgs: ['--enable-automation'],
    };

    console.log('Launching browser...');
    browser = await puppeteer.launch(launchOptions);
    page = await browser.newPage();
    
    // Set longer timeout for navigation
    page.setDefaultNavigationTimeout(60000);
    
    // Advanced request interception with improved handling
    await page.setRequestInterception(true);
    page.on('request', (request) => {
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

    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    // Add realistic browser fingerprinting
    await page.evaluateOnNewDocument(() => {
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

    // Setup console and dialog monitoring
    page.on('console', msg => {
      const text = msg.text();
      // Filter out noisy messages
      if (!text.includes('Failed to load resource: net::ERR_FAILED')) {
        console.log(`BROWSER CONSOLE: ${text}`);
      }
    });
    
    page.on('dialog', async dialog => {
      console.log(`DIALOG: ${dialog.message()}`);
      await dialog.dismiss();
    });

    // Load cookies from account
    console.log('Loading LinkedIn session cookies...');
    if (!account.sessionData) {
      throw new Error('No session data found for account');
    }

    try {
      const cookies = JSON.parse(account.sessionData);
      console.log(`Found ${cookies.length} cookies`);
      await page.setCookie(...cookies);
    } catch (error) {
      throw new Error(`Failed to parse session cookies: ${error.message}`);
    }

    // First visit the LinkedIn homepage with improved navigation
    console.log('Visiting LinkedIn homepage...');
    const homeNavSuccess = await navigateWithRetry(page, 'https://www.linkedin.com/');
    if (!homeNavSuccess) {
      throw new Error('Failed to navigate to LinkedIn homepage after multiple attempts');
    }
    
    await randomSleep(3000, 5000);
    await page.screenshot({ path: path.join(screenshotsDir, '1-homepage.png') });

    // Check if we're redirected to login page
    if (page.url().includes('/login')) {
      console.log('Redirected to login page - session cookies may be invalid');
      await page.screenshot({ path: path.join(screenshotsDir, '2-login-page.png') });
      
      // If headless mode is enabled, we need to abort
      if (isHeadless) {
        throw new Error('Login required but running in headless mode. Please run in non-headless mode first to refresh cookies.');
      }
      
      await waitForInput('Please log in manually in the browser window. After logging in, press Enter.');
      
      // Save new cookies after manual login
      const newCookies = await page.cookies();
      account.sessionData = JSON.stringify(newCookies);
      await account.save();
      console.log('Saved new cookies after manual login');
    }

    // Check login status by visiting feed page
    console.log('Visiting LinkedIn feed to verify login...');
    const feedNavSuccess = await navigateWithRetry(page, 'https://www.linkedin.com/feed/');
    if (!feedNavSuccess) {
      throw new Error('Failed to navigate to LinkedIn feed page after multiple attempts');
    }
    
    await randomSleep(3000, 5000);
    await page.screenshot({ path: path.join(screenshotsDir, '3-feed-page.png') });

    // Navigate to the target profile with improved navigation
    console.log(`Navigating to profile: ${profileUrl}`);
    const profileNavSuccess = await navigateWithRetry(page, profileUrl);
    if (!profileNavSuccess) {
      throw new Error(`Failed to navigate to profile ${profileUrl} after multiple attempts`);
    }
    
    await randomSleep(5000, 8000);
    await page.screenshot({ path: path.join(screenshotsDir, '4-profile-page.png') });

    // Try multiple methods to send a connection request
    const connectionSent = await tryConnectionMethods(page, screenshotsDir);
    
    if (connectionSent) {
      console.log('Connection request sent successfully!');
    } else {
      console.log('Could not send connection request. Taking full page screenshot for debugging...');
      await page.screenshot({ 
        path: path.join(screenshotsDir, 'full-page-debug.png'),
        fullPage: true 
      });
      
      // Try to analyze why connection couldn't be sent
      await analyzeConnectionFailure(page, screenshotsDir);
    }

    // Save updated cookies back to the database
    const currentCookies = await page.cookies();
    account.sessionData = JSON.stringify(currentCookies);
    account.lastUsed = new Date();
    await account.save();
    console.log(`Updated session cookies for account ${account._id}`);

    console.log('Connection request operation completed!');
    
    if (!isHeadless) {
      await waitForInput('Operation complete. Press Enter to close the database connection (browser will remain open).');
    }

  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    console.error(error.stack);

    if (page) {
      try {
        await page.screenshot({ path: path.join(screenshotsDir, 'error-screenshot.png') });
        console.log('Saved error screenshot to error-screenshot.png');
      } catch (e) {
        console.error('Failed to take error screenshot');
      }
    }
  } finally {
    // Close MongoDB connection
    if (mongoose.connection.readyState) {
      await mongoose.connection.close();
      console.log('Closed MongoDB connection');
    }

    // Close readline interface
    rl.close();

    if (!isHeadless) {
      console.log('\nBrowser will remain open for inspection.');
      console.log('Press Ctrl+C when done to close the browser and exit the script.');
    } else {
      if (browser) {
        await browser.close();
        console.log('Browser closed');
      }
    }
  }
}

/**
 * Analyze why connection request failed
 */
async function analyzeConnectionFailure(page, screenshotsDir) {
  console.log('Analyzing why connection could not be sent...');
  
  try {
    // Check if already connected or pending
    const connectionStatusSelectors = [
      '.pvs-profile-actions__action:has-text("Pending")', 
      'button:has-text("Pending")', 
      'span:has-text("Pending")',
      '.pvs-profile-actions__action:has-text("Message")', 
      'button:has-text("Message")'
    ];
    
    const statusElement = await findElementWithSelectors(page, connectionStatusSelectors);
    if (statusElement) {
      const statusText = await page.evaluate(el => el.textContent.trim(), statusElement);
      if (statusText.includes('Pending')) {
        console.log('Analysis result: Connection request already pending');
        return;
      } else if (statusText.includes('Message')) {
        console.log('Analysis result: Already connected with this person');
        return;
      }
    }
    
    // Check for page loading status
    const pageStructure = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        bodyLength: document.body.innerHTML.length,
        hasProfileActions: !!document.querySelector('.pvs-profile-actions'),
        hasConnect: document.body.innerHTML.includes('Connect'),
        visibleButtons: Array.from(document.querySelectorAll('button'))
          .filter(b => b.offsetParent !== null)  // Only visible buttons
          .map(b => b.textContent.trim())
          .filter(Boolean)
      };
    });
    
    console.log('Page analysis:', JSON.stringify(pageStructure, null, 2));
    
    if (pageStructure.bodyLength < 5000) {
      console.log('Analysis result: Page did not load completely');
    } else if (!pageStructure.hasProfileActions) {
      console.log('Analysis result: Profile actions section not found');
    } else if (pageStructure.hasConnect && pageStructure.visibleButtons.length === 0) {
      console.log('Analysis result: "Connect" text found but no clickable buttons visible');
    } else {
      console.log('Analysis result: Unknown issue, check screenshots for details');
    }
    
    // Save HTML structure for debugging
    const htmlStructure = await page.content();
    fs.writeFileSync(path.join(screenshotsDir, 'page-structure.html'), htmlStructure);
    
  } catch (error) {
    console.warn(`Error during connection failure analysis: ${error.message}`);
  }
}

// Run with command line arguments
const profileArg = process.argv[2];
const profileUrl = profileArg || 'https://www.linkedin.com/in/thomas-packer';

sendConnectionRequest(profileUrl).catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});