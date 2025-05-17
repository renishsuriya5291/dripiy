// src/direct-profile-view.js
require('dotenv').config();
const mongoose = require('mongoose');
const LinkedInBrowser = require('./LinkedInBrowser');
const LinkedInAccount = require('../models/LinkedInAccount');
const logger = require('../utils/logger');

async function testProfileView() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Get a LinkedIn account
    const account = await LinkedInAccount.findOne({ status: 'active' });
    if (!account) {
      throw new Error('No active LinkedIn account found');
    }
    console.log(`Using account: ${account.email}`);
    
    // Create browser
    const browser = new LinkedInBrowser();
    browser.account = account;
    browser.isHeadless = false; // Make it visible
    
    // Initialize browser
    console.log('Initializing browser...');
    const initialized = await browser.initialize();
    if (!initialized) {
      throw new Error('Failed to initialize browser');
    }
    
    // Test profile view
    const testUrl = 'https://www.linkedin.com/in/williamhgates/'; // Use a well-known profile
    console.log(`Visiting profile: ${testUrl}`);
    
    const startTime = Date.now();
    const result = await browser.visitProfile(testUrl);
    const duration = Date.now() - startTime;
    
    console.log(`Result: ${result ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Duration: ${duration}ms`);
    
    // Wait a moment to see the result
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Clean up
    console.log('Cleaning up...');
    await browser.cleanup();
    
    // Disconnect from MongoDB
    await mongoose.connection.close();
    console.log('Test completed');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testProfileView();