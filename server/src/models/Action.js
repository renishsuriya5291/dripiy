const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ActionSchema = new Schema({
  campaign: { type: Schema.Types.ObjectId, ref: 'Campaign' },
  lead: { type: Schema.Types.ObjectId, ref: 'Lead' },
  sequence: { type: Schema.Types.ObjectId, ref: 'Sequence' },
  nodeId: String,
  type: {
    type: String,
    enum: [
      'send_invite', 'send_message', 'send_inmail', 
      'view_profile', 'endorse_skills', 'follow', 
      'like_post', 'find_email', 'send_email'
    ]
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed', 'paused']
  },
  data: {
    message: String,
    subject: String,
    variantId: String
  },
  result: {
    success: Boolean,
    response: Object,
    error: String
  },
  scheduledFor: Date,
  executedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Action', ActionSchema);
