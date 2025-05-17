require('dotenv').config('./.env');
const app = require('./src/app');
const connectDB = require('./src/config/db');

// Connect to MongoDB
connectDB(process.env.MONGO_URI);

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
