const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const WorkingHourSchema = new Schema({
  day: { type: Number, required: true }, // 0=Sunday, 1=Monday, ..., 6=Saturday
  enabled: { type: Boolean, default: true },
  start: { type: String, required: true }, // e.g., "12:00 am"
  end: { type: String, required: true }    // e.g., "11:00 pm"
}, { _id: false });

const UserSchema = new Schema({
  email: String,
  password: String,
  name: String,
  linkedInCredentials: {
    email: String,
    accessToken: String,
    refreshToken: String,
    expiresAt: Date
  },
  workingHours: {
    timezone: String,
    days: [WorkingHourSchema] // Array of working hours per day
  },
  settings: {
    dailyLimits: {
      connections: Number,
      messages: Number,
      profileViews: Number,
      endorsements: Number
    }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
