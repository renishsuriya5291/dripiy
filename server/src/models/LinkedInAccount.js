// models/LinkedInAccount.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LinkedInAccountSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  email: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    default: 'LinkedIn User',
  },
  linkedInId: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['active', 'connecting', 'restricted', 'inactive'],
    default: 'connecting',
  },
  connectionStatus: {
    type: String,
    default: 'Connected',
  },
  dailyUsage: {
    type: String,
    default: '0%',
  },
  lastUsed: {
    type: Date,
    default: Date.now,
  },
  // Store session data (cookies)
  sessionData: {
    type: String,
    required: true
  },
  // Limits for various actions
  limits: {
    invitesPerDay: {
      type: Number,
      default: 50,
    },
    messagesPerDay: {
      type: Number,
      default: 100,
    },
    viewsPerDay: {
      type: Number,
      default: 150,
    },
  },
  // Store daily usage for rate limiting
  dailyStats: {
    invitesSent: {
      type: Number,
      default: 0,
    },
    messagesSent: {
      type: Number,
      default: 0,
    },
    profilesViewed: {
      type: Number,
      default: 0,
    },
    lastReset: {
      type: Date,
      default: Date.now,
    },
  },
}, {
  timestamps: true,
});

// Middleware to calculate daily usage percentage before saving
LinkedInAccountSchema.pre('save', function (next) {
  // Calculate total usage as percentage of limits
  const invitePercentage = (this.dailyStats.invitesSent / this.limits.invitesPerDay) * 100;
  const messagePercentage = (this.dailyStats.messagesSent / this.limits.messagesPerDay) * 100;
  const viewPercentage = (this.dailyStats.profilesViewed / this.limits.viewsPerDay) * 100;
  
  // Take the highest percentage as the overall usage
  const maxPercentage = Math.max(invitePercentage, messagePercentage, viewPercentage);
  this.dailyUsage = `${Math.min(100, Math.round(maxPercentage))}%`;
  
  // Reset daily stats if last reset was yesterday or earlier
  const today = new Date().setHours(0, 0, 0, 0);
  const lastReset = new Date(this.dailyStats.lastReset).setHours(0, 0, 0, 0);
  
  if (today > lastReset) {
    this.dailyStats = {
      invitesSent: 0,
      messagesSent: 0,
      profilesViewed: 0,
      lastReset: new Date(),
    };
  }
  
  next();
});

module.exports = mongoose.model('LinkedInAccount', LinkedInAccountSchema);