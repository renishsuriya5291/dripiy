const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CampaignSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User' },
  name: String,
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed', 'running', 'stopped'],
  },
  leadLists: [{ type: Schema.Types.ObjectId, ref: 'LeadList' }],
  sequence: { type: Schema.Types.ObjectId, ref: 'Sequence' },
  filters: {
    excludeLeadsInOtherCampaigns: Boolean,
    excludeLimitedProfiles: Boolean,
    excludeFreeAccounts: Boolean,
    customFilters: Object
  },
  webhooks: [{
    event: {
      type: String,
      enum: ['invite_sent', 'invite_accepted', 'message_sent', 'message_replied', 'profile_viewed']
    },
    url: String,
    active: Boolean
  }],
  analytics: {
    invitesSent: Number,
    invitesAccepted: Number,
    messagesSent: Number,
    messagesReplied: Number,
    profilesViewed: Number,
    acceptanceRate: Number,
    replyRate: Number
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastRunAt: Date
});

module.exports = mongoose.model('Campaign', CampaignSchema);
