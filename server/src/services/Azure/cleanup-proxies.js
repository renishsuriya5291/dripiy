// scripts/cleanup-proxies.js
const mongoose = require('mongoose');
const Proxy = require('../../models/Proxy'); // Assuming you have a Proxy model defined

const path = require("path");
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

async function cleanupProxies() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    console.log('Deleting all proxy records...');
    const result = await Proxy.deleteMany({});
    console.log(`Deleted ${result.deletedCount} proxies from the database`);

    console.log('Done!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error cleaning up proxies:', error);
    process.exit(1);
  }
}

cleanupProxies();