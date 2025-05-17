const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LinkedInAuthSessionSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // Explicitly define sessionId as String type
    sessionId: { type: String, required: true, index: true },
    status: {
        type: String,
        enum: ['pending', '2fa_required', 'captcha_required', 'email_verification_required', 'success', 'failed'],
        default: 'pending'
    },
    cookies: {
        type: String,
        required: true
    }, error: String,
    challengeData: Schema.Types.Mixed,
    lastUsed: Date,
    version: {
        type: Number,
        default: 1
    }
}, { timestamps: true });

module.exports = mongoose.model('LinkedInAuthSession', LinkedInAuthSessionSchema);
