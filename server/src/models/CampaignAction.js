// models/CampaignAction.js - Updated version
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CampaignActionSchema = new Schema({
  campaign: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
  lead: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
  type: {
    type: String,
    enum: [
      'invite_sent', 
      'invite_accepted', 
      'message_sent', 
      'message_replied',
      'profile_viewed',
      'skills_endorsed',
      'profile_followed',
      'post_liked',
      'email_sent',
      'error'
    ],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  actionData: {
    nodeId: String,
    message: String,
    subject: String,
    response: String,
    error: Object,
    metadata: Object
  },
  scheduledFor: Date,
  executedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

// Index for efficient queries
CampaignActionSchema.index({ campaign: 1, lead: 1, type: 1 });
CampaignActionSchema.index({ campaign: 1, status: 1 });
CampaignActionSchema.index({ scheduledFor: 1, status: 1 });

module.exports = mongoose.model('CampaignAction', CampaignActionSchema);