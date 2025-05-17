const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LeadJourneySchema = new Schema({
  campaign: { type: Schema.Types.ObjectId, ref: 'Campaign' },
  lead: { type: Schema.Types.ObjectId, ref: 'Lead' },
  currentNodeId: String,
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'awaiting', 'paused', 'failed', 'blacklisted']
  },
  actions: [{ type: Schema.Types.ObjectId, ref: 'Action' }],
  metrics: {
    inviteSent: Boolean,
    inviteAccepted: Boolean,
    messagesSent: Number,
    messagesReplied: Number,
    profileViewed: Boolean
  },
  nextActionScheduledFor: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('LeadJourney', LeadJourneySchema);
