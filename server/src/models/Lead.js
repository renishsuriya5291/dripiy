const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LeadSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User' },
  name: String,
  // In LeadSchema
  linkedInUrl: {
    type: String,
    validate: {
      validator: function (v) {
        return !!v || !!this.linkedInId;
      },
      message: 'At least one of linkedInUrl or linkedInId is required'
    }
  },
  linkedInId: String,
  firstName: String,
  lastName: String,
  headline: String,
  company: String,
  position: String,
  location: String,
  profilePictureUrl: String,
  email: String,
  phone: String,
  connectionStatus: {
    type: String,
    enum: ['not_connected', 'pending', 'connected', 'withdrawn']
  },
  tags: [String],
  source: {
    type: String,
    enum: ['basic_search', 'sales_navigator', 'recruiter', 'event', 'group', 'network', 'csv', 'url']
  },
  sourceDetails: String,
  campaigns: [{ type: Schema.Types.ObjectId, ref: 'Campaign' }],
  status: {
    type: String,
    enum: ['active', 'paused', 'blacklisted', 'completed']
  },
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lead', LeadSchema);
