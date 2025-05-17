require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const passport = require('./config/passport');
const session = require('express-session');
const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');

// Import our distributed system components
const localQueueService = require('./services/Azure/LocalQueueService');
const linkedinBrowserService = require('./services/linkedinBrowserService');
const localBrowserClusterManager = require('./services/Azure/LocalBrowserClusterManager');
const localProxyManager = require('./services/Azure/LocalProxyManager');
const campaignWorker = require('./workers/campaignWorker');
const linkedinActionService = require('./services/linkedinActionService');
const logger = require('./utils/logger');

// Import original queues for compatibility
const campaignQueue = require('./queues/campaignQueue');

// import routes
const authRoutes = require('./routes/auth');
const linkedinRoutes = require('./routes/linkedin');
const leadListRoutes = require('./routes/leadList');
const sequenceRoutes = require('./routes/sequence');
const userRoutes = require('./routes/user');
const campaignRoutes = require('./routes/campaign');

const app = express();

// Configure Bull Board
const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [new BullMQAdapter(campaignQueue)],
  serverAdapter
});
serverAdapter.setBasePath('/admin/queues');
app.use('/admin/queues', serverAdapter.getRouter());

// Add Helmet for security
app.use(helmet());

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS setup
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(session({
  secret: process.env.SESSION_SECRET || 'your_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' } // secure in production
}));

app.use(passport.initialize());
app.use(passport.session());

// Static file serving (avatars, uploads, etc.)
const avatarsDir = path.join(__dirname, "../public/avatars");
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}
app.use("/avatars", express.static(avatarsDir));

// Add more static folders as needed
const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use("/uploads", express.static(uploadDir));

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Middleware
app.use(morgan(process.env.LOG_LEVEL || 'dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX || 100
});
app.use(limiter);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/linkedin', linkedinRoutes);
app.use('/api/leadlists', leadListRoutes);
app.use('/api/sequences', sequenceRoutes);
app.use('/api/user', userRoutes);
app.use('/api/campaigns', campaignRoutes);

// Add a dashboard route for the distributed system
app.get("/api/system/status", async (req, res) => {
  try {
    // Get system status
    const workerCount = await localBrowserClusterManager.getWorkerCount();
    const proxyCount = await localProxyManager.getProxyCount();
    const pendingActions = await linkedinActionService.getPendingActionCount();
    
    res.status(200).json({
      status: "ok",
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      distributed_system: {
        browser_workers: workerCount,
        proxies: {
          total: proxyCount.total,
          active: proxyCount.active
        },
        actions: {
          pending: pendingActions,
          queued: await localQueueService.getQueueLength('campaign-actions')
        },
        uptime: process.uptime()
      }
    });
  } catch (error) {
    logger.error('Error getting system status:', error);
    res.status(500).json({ error: 'Error getting system status' });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Root route
app.get("/", (req, res) => {
  res.send(`API is running in ${process.env.NODE_ENV || 'development'} mode`);
});

// Handle errors
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Initialize distributed system components
async function initializeDistributedSystem() {
  try {
    logger.info('Initializing distributed system components...');
    
    // Initialize queue service
    await localQueueService.initialize();
    logger.info('Queue service initialized');
    
    // Initialize proxy manager
    await localProxyManager.initialize();
    logger.info('Proxy manager initialized');
    
    // Initialize browser cluster manager
    await localBrowserClusterManager.initialize();
    logger.info('Browser cluster manager initialized');
    
    // Initialize LinkedIn browser service
    await linkedinBrowserService.initialize();
    logger.info('LinkedIn browser service initialized');
    
    // Initialize and start the campaign worker
    await campaignWorker.start();
    logger.info('Campaign worker started');
    
    logger.info('All distributed system components initialized successfully');
    return true;
  } catch (error) {
    logger.error('Error initializing distributed system:', error);
    return false;
  }
}

// Shutdown distributed system components
async function shutdownDistributedSystem() {
  try {
    logger.info('Shutting down distributed system components...');
    
    // Stop the campaign worker
    await campaignWorker.stop();
    logger.info('Campaign worker stopped');
    
    // Shutdown LinkedIn browser service
    await linkedinBrowserService.shutdown();
    logger.info('LinkedIn browser service shut down');
    
    // Shutdown browser cluster manager
    await localBrowserClusterManager.shutdown();
    logger.info('Browser cluster manager shut down');
    
    // Close queue service
    await localQueueService.close();
    logger.info('Queue service closed');
    
    logger.info('All distributed system components shut down successfully');
    return true;
  } catch (error) {
    logger.error('Error shutting down distributed system:', error);
    return false;
  }
}

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ...(process.env.MONGODB_USER && process.env.MONGODB_PASSWORD ? {
    user: process.env.MONGODB_USER,
    pass: process.env.MONGODB_PASSWORD
  } : {})
})
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Initialize distributed system
    const systemInitialized = await initializeDistributedSystem();
    if (!systemInitialized) {
      console.error('Failed to initialize distributed system');
      process.exit(1);
    }
    
    // Start server
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      
      // Handle graceful shutdown
      const gracefulShutdown = async (signal) => {
        console.log(`${signal} signal received: closing HTTP server`);
        server.close(async () => {
          console.log('HTTP server closed');
          
          // Shut down distributed system
          await shutdownDistributedSystem();
          
          // Close database connections
          await mongoose.connection.close();
          console.log('MongoDB connection closed');
          
          process.exit(0);
        });
      };
      
      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = app;