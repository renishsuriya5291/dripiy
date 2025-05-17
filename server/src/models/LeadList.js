const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LeadListSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User' },
  name: String,
  description: String,
  leads: [{ type: Schema.Types.ObjectId, ref: 'Lead' }],
  source: {
    type: String,
    enum: ['basic_search', 'sales_navigator', 'recruiter', 'event', 'group', 'network', 'csv', 'url']
  },
  sourceDetails: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LeadList', LeadListSchema);
