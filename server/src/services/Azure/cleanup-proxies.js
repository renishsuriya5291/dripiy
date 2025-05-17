// scripts/cleanup-proxies.js
require('dotenv').config();
const mongoose = require('mongoose');
const Proxy = require('../../models/Proxy'); // Assuming you have a Proxy model defined


async function cleanupProxies() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect("mongodb+srv://renishsuriya1441:1kxLj1jGx4gyhQ1B@cluster0.0qq5u.mongodb.net/dripify-clone", {
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