const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SequenceSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User' },
  name: String,
  description: String,
  isTemplate: Boolean,
  templateType: {
    type: String,
    enum: ['lead_generation', 'endorse_skills', 'extra_profile_views', 'custom']
  },
  nodes: [{
    id: String,
    type: {
      type: String,
      enum: [
        'start', 'end', 'send_invite', 'send_message', 'send_inmail',
        'view_profile', 'endorse_skills', 'follow', 'like_post',
        'find_email', 'send_email', 'delay', 'condition'
      ]
    },
    position: {
      x: Number,
      y: Number
    },
    data: {
      message: String,
      subject: String,
      delay: {
        value: Number,
        unit: {
          type: String,
          enum: ['minutes', 'hours', 'days', 'weeks'],
          default: 'days'
        }
      },
      condition: {
        type: String,
        enum: ['invite_accepted', 'message_read', 'profile_open']
      },
      variants: [{
        content: String,
        subject: String
      }]
    }
  }],
  edges: [{
    id: String,
    source: String,
    target: String,
    sourceHandle: String,
    targetHandle: String,
    label: String
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Sequence', SequenceSchema);
