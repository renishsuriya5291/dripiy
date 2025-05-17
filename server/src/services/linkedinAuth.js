const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const LinkedInAuthSession = require('../models/LinkedInAuthSession');
const { encrypt, decrypt } = require('./encryptionService');
const { v4: uuidv4 } = require('uuid');

puppeteer.use(StealthPlugin());

async function loginAndStoreCookies(email, password, userId) {
const browser = await puppeteer.launch({
headless: 'new',
args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
],
});


const sessionId = uuidv4();
let authSession = await LinkedInAuthSession.findOneAndUpdate(
{ user: userId },
{
    $set: {
        sessionId,
        status: 'pending',
        error: null,
        lastUsed: new Date()
    }
},
{ upsert: true, new: true, setDefaultsOnInsert: true }
);

try {
const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');


// Enhanced navigation handling
await updateStatus(userId, 'Navigating to LinkedIn login...');
await page.goto('https://www.linkedin.com/login', {
    waitUntil: 'networkidle2',
    timeout: 60000
});

// Robust input handling
await updateStatus(userId, 'Entering credentials...');
await page.type('#username', email, { delay: 50, timeout: 5000 });
await page.type('#password', password, { delay: 50, timeout: 5000 });

await updateStatus(userId, 'Submitting login form...');
await page.click('button[type="submit"]');

try {
    await Promise.race([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
        page.waitForSelector('.global-nav__me', { timeout: 15000 })
    ]);
} catch (e) {
    // Not fatal if we can still verify login
}

// Improved success verification
await updateStatus(userId, 'Verifying login status...');
let isLoggedIn = await verifyLoginSuccess(page);

if (!isLoggedIn) {
    await updateStatus(userId, 'Handling login challenges...');
    const challengeStatus = await handleLoginChallenges(page, authSession);
    if (challengeStatus !== 'success') {
        throw new Error(`Authentication challenge: ${challengeStatus}`);
    }
    
    isLoggedIn = await verifyLoginSuccess(page);
}

if (!isLoggedIn) {
    throw new Error('Login verification failed after challenge handling');
}

// Secure cookie handling
await updateStatus(userId, 'Capturing session cookies...');
const cookies = await captureLinkedInCookies(page);
// const encryptedCookies = await encrypt(JSON.stringify(cookies));
const encryptedCookies = JSON.stringify(cookies);


await LinkedInAuthSession.findOneAndUpdate(
    { user: userId },
    {
        $set: {
            status: 'success',
            cookies: encryptedCookies,
            lastUsed: new Date(),
            error: null
        }
    }
);

return sessionId;
} catch (err) {
await LinkedInAuthSession.findOneAndUpdate(
    { user: userId },
    {
        $set: {
            status: 'failed',
            error: err.message,
            lastUsed: new Date()
        }
    }
);
throw err;
} finally {
await browser.close();
}
}


async function updateStatus(userId, statusMessage) {
await LinkedInAuthSession.findOneAndUpdate(
{ user: userId },
{ $set: { statusMessage } }
);
}


async function handleLoginChallenges(page, authSession) {
const challengeSelectors = [
{ 
    selector: '#input__phone_verification_pin', 
    status: '2fa_required',
    message: 'Two-factor authentication required'
},
{ 
    selector: '#captcha-internal', 
    status: 'captcha_required',
    message: 'CAPTCHA verification required'
},
{ 
    selector: '#email-pin-verification', 
    status: 'email_verification_required',
    message: 'Email verification required'
}
];

for (const { selector, status, message } of challengeSelectors) {
const detected = await page.waitForSelector(selector, { timeout: 5000 })
    .then(() => true)
    .catch(() => false);

if (detected) {
    await authSession.updateOne({ 
        status,
        statusMessage: message 
    });
    return status;
}
}

await authSession.updateOne({ 
status: 'failed',
statusMessage: 'Unknown authentication challenge'
});
return 'failed';
}



async function verifyLoginSuccess(page) {
try {
await page.waitForSelector('.global-nav__me', { timeout: 10000 });
return true;
} catch {
return false;
}
}

async function captureLinkedInCookies(page) {
const client = await page.target().createCDPSession();
const { cookies: allCookies } = await client.send('Network.getAllCookies');

// Essential cookies for LinkedIn authentication and actions
const essentialCookies = [
'li_at',       // Main authentication token
'JSESSIONID',  // Session identifier
'lang',        // Language preference
'bcookie',     // Browser identifier
'li_rm',       // Remember me
'lidc',        // LinkedIn Data Consent
'liap',        // LinkedIn AP cookie
'li_mc',       // Member cookie
'li_g',        // LinkedIn general cookie
'li_gc'        // LinkedIn general cookie
];

// First, prioritize the essential cookies
let linkedinCookies = allCookies.filter(c => 
c.domain.includes('.linkedin.com') && 
essentialCookies.includes(c.name)
);

// Check if we have the absolute minimum required cookies (li_at is the most critical)
const hasLiAt = linkedinCookies.some(c => c.name === 'li_at');

if (!hasLiAt) {
throw new Error('Critical authentication cookie (li_at) not found');
}

// If we're missing some cookies from our essential list, log a warning
const foundCookieNames = linkedinCookies.map(c => c.name);
const missingEssential = essentialCookies.filter(name => !foundCookieNames.includes(name));

if (missingEssential.length > 0) {
console.warn(`Some recommended LinkedIn cookies not found: ${missingEssential.join(', ')}`);
}

// For actions like following, liking, etc., it's better to have more LinkedIn cookies
// So let's also include any other linkedin.com cookies to ensure maximum compatibility
const additionalCookies = allCookies.filter(c => 
c.domain.includes('.linkedin.com') && 
!essentialCookies.includes(c.name)
);

// Combine essential and additional cookies
linkedinCookies = [...linkedinCookies, ...additionalCookies];

if (linkedinCookies.length === 0) {
throw new Error('No LinkedIn cookies found');
}

console.log(`Captured ${linkedinCookies.length} LinkedIn cookies`);
return linkedinCookies;
}

async function handle2FA(sessionId, code) {
const authSession = await LinkedInAuthSession.findOne({ sessionId });
if (!authSession) throw new Error('Invalid session');

const browser = await puppeteer.launch({
headless: 'new',
args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
],
});

try {
const page = await browser.newPage();

if (authSession.cookies) {
    try {
        const cookies = JSON.parse(authSession.cookies);
        await page.setCookie(...cookies);
    } catch (decryptError) {
        console.error('Cookie decryption failed:', decryptError);
        throw new Error('Session cookie restoration failed');
    }
}

await page.goto('https://www.linkedin.com/checkpoint/lg/login-submit', {
    waitUntil: 'networkidle2',
    timeout: 30000
});

await page.type('#verification-code', code, { delay: 50 });
await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
    page.click('button[type="submit"]')
]);

if (!(await verifyLoginSuccess(page))) {
    throw new Error('2FA verification failed - incorrect code or new challenge');
}

const cookies = await captureLinkedInCookies(page);
// const encryptedCookies = await encrypt(JSON.stringify(cookies));
const encryptedCookies = JSON.stringify(cookies);


await LinkedInAuthSession.findOneAndUpdate(
    { user: authSession.user },
    {
        $set: {
            status: 'success',
            cookies: encryptedCookies,
            lastUsed: new Date(),
            error: null
        }
    }
);

return true;
} catch (err) {
await LinkedInAuthSession.findOneAndUpdate(
    { user: authSession.user },
    {
        $set: {
            status: 'failed',
            error: `2FA failure: ${err.message}`,
            lastUsed: new Date()
        }
    }
);
throw err;
} finally {
await browser.close();
}
}

module.exports = {
loginAndStoreCookies,
handle2FA
};
