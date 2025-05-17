// services/LinkedInActionService.js
const CampaignAction = require('../models/CampaignAction');
const Campaign = require('../models/Campaign');
const Lead = require('../models/Lead');
const LinkedInAccount = require('../models/LinkedInAccount');
const logger = require('../utils/logger');
const linkedinBrowserService = require('./linkedinBrowserService');
const localQueueService = require('./Azure/LocalQueueService');
const { EventEmitter } = require('events');

// Action queue name
const CAMPAIGN_ACTION_QUEUE = 'campaign-actions';

class LinkedInActionService extends EventEmitter {
  constructor() {
    super();

    // Configuration for action processing
    this.batchSize = process.env.ACTION_BATCH_SIZE ? parseInt(process.env.ACTION_BATCH_SIZE) : 5;
    this.processingEnabled = true;
    this.isProcessing = false;

    // Metrics and monitoring
    this.metrics = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      retried: 0
    };

    // Maximum retry attempts
    this.maxRetries = 3;

    // Configure delays to simulate human behavior and avoid rate limiting
    this.minActionDelay = 30000;  // 30 seconds
    this.maxActionDelay = 120000; // 2 minutes

    // Throttling to avoid LinkedIn detection
    this.dailyActionLimit = 100;
    this.campaignActionLimits = new Map(); // Map of campaignId -> { count, lastReset }

    // Add jitter to randomize timing patterns
    this.jitterFactor = 0.2; // 20% jitter

    // Processing interval
    this.processingInterval = null;
  }
  async getPendingActionCount() {
    return await CampaignAction.countDocuments({ status: 'pending' });
  }

  /**
   * Sleep for a specified duration with jitter
   * @param {number} ms - Base time to sleep in milliseconds
   */
  async sleep(ms) {
    const jitter = Math.random() * this.jitterFactor * 2 - this.jitterFactor; // -jitter to +jitter
    const adjustedMs = Math.max(0, Math.floor(ms * (1 + jitter)));
    return new Promise(resolve => setTimeout(resolve, adjustedMs));
  }

  /**
   * Get a random delay within range with jitter
   */
  getRandomDelay(min, max) {
    const baseDelay = Math.floor(Math.random() * (max - min + 1)) + min;
    const jitter = Math.random() * this.jitterFactor * 2 - this.jitterFactor; // -jitter to +jitter
    return Math.max(0, Math.floor(baseDelay * (1 + jitter)));
  }

  /**
   * Initialize the service and start the processing loop
   */
  async initialize() {
    logger.info('Initializing LinkedIn Action Service');

    // Initialize LinkedInBrowserService
    await linkedinBrowserService.initialize();

    // Initialize queue service
    await localQueueService.initialize();

    // Start listening for queue messages
    await this.startListening();

    // Start the processing loop at regular intervals
    // This ensures our system processes actions at consistent intervals
    this.processingInterval = setInterval(() => {
      if (!this.isProcessing && this.processingEnabled) {
        this.processPendingActions(this.batchSize).catch(err => {
          logger.error('Error in LinkedIn action processing:', err);
        });
      }
    }, 5 * 60 * 1000); // Run every 5 minutes

    // Also run it immediately on startup after a small delay
    setTimeout(() => {
      if (this.processingEnabled) {
        this.processPendingActions(this.batchSize).catch(err => {
          logger.error('Error in LinkedIn action processing:', err);
        });
      }
    }, 10000);

    logger.info('LinkedIn Action Service initialized');
  }

  /**
   * Start listening for queue messages
   */
  async startListening() {
    await localQueueService.receiveMessages(CAMPAIGN_ACTION_QUEUE, async (message) => {
      try {
        logger.info(`Received message from queue ${CAMPAIGN_ACTION_QUEUE}`);

        const { actionId } = message;

        // Find the action in the database
        const action = await CampaignAction.findById(actionId)
          .populate('campaign')
          .populate('lead');

        if (!action) {
          logger.warn(`Action ${actionId} not found`);
          return;
        }

        // Execute the action
        await this.executeAction(action);
      } catch (error) {
        logger.error(`Error processing message from queue ${CAMPAIGN_ACTION_QUEUE}:`, error);
      }
    });

    logger.info(`Started listening for messages from queue ${CAMPAIGN_ACTION_QUEUE}`);
  }

  /**
   * Track campaign action limits
   * @param {string} campaignId - Campaign ID
   * @returns {boolean} True if under limit, false otherwise
   */
  trackCampaignUsage(campaignId) {
    if (!this.campaignActionLimits.has(campaignId)) {
      this.campaignActionLimits.set(campaignId, {
        count: 0,
        lastReset: Date.now()
      });
    }

    const usage = this.campaignActionLimits.get(campaignId);

    // Reset daily count if needed
    if (Date.now() - usage.lastReset > 24 * 60 * 60 * 1000) {
      usage.count = 0;
      usage.lastReset = Date.now();
    }

    // Increment count
    usage.count++;

    // Check limit
    if (usage.count > this.dailyActionLimit) {
      logger.warn(`Campaign ${campaignId} has reached the daily action limit of ${this.dailyActionLimit}`);
      return false;
    }

    return true;
  }

  /**
   * Shutdown the service
   */
  async shutdown() {
    logger.info('Shutting down LinkedIn Action Service');

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    this.processingEnabled = false;

    // Shutdown browser service
    await linkedinBrowserService.shutdown();
  }

  /**
   * Process a batch of pending actions
   * @param {number} limit - Maximum number of actions to process
   */
  // services/LinkedInActionService.js
  // Update the processPendingActions method

  async processPendingActions(limit = 5) {
    try {
      // Check if processing is already in progress
      if (this.isProcessing) {
        logger.info('Action processing already in progress, skipping');
        return { total: 0, completed: 0, failed: 0 };
      }

      this.isProcessing = true;

      logger.info(`Fetching up to ${limit} pending LinkedIn actions`);

      // Find pending actions that are due to be executed
      const actions = await CampaignAction.find({
        status: 'pending',
        scheduledFor: { $lte: new Date() }
      })
        .sort({ scheduledFor: 1 })
        .limit(limit)
        .populate('campaign')
        .populate('lead');

      if (actions.length === 0) {
        logger.info('No pending LinkedIn actions found');
        this.isProcessing = false;
        return { total: 0, completed: 0, failed: 0 };
      }

      logger.info(`Processing ${actions.length} pending LinkedIn actions`);

      let completed = 0;
      let failed = 0;

      // Use queue for processing instead of direct execution
      for (const action of actions) {
        try {
          // Check if campaign is still active before processing
          if (!action.campaign || action.campaign.status !== 'running') {
            logger.info(`Skipping action ${action._id} - campaign is not running`);

            // Update status to failed with reason instead of using 'cancelled'
            action.status = 'failed';
            action.actionData = action.actionData || {};
            action.actionData.error = { message: 'Campaign is no longer running' };
            await action.save();

            failed++;
            continue;
          }

          // Track campaign usage
          if (!this.trackCampaignUsage(action.campaign._id.toString())) {
            logger.info(`Skipping action ${action._id} - campaign has reached daily limit`);

            // Reschedule the action for tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(8 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60), 0); // 8am-12pm

            action.scheduledFor = tomorrow;
            await action.save();

            continue;
          }

          // DO NOT change status to 'in_progress'
          // Keep it as 'pending' until completed or failed

          // Send to queue for distributed processing
          await localQueueService.sendMessage(CAMPAIGN_ACTION_QUEUE, {
            actionId: action._id.toString()
          });

          logger.info(`Sent action ${action._id} to queue for processing`);

          // For simplicity in local testing, we'll consider this a success
          // In real deployment, the queue would handle this separately
          completed++;

          // Add delay between sendings to avoid overwhelming the queue
          await this.sleep(Math.random() * 1000);
        } catch (error) {
          logger.error(`Error queuing action ${action._id}:`, error);
          failed++;

          // Update action with error
          action.actionData = action.actionData || {};
          action.actionData.lastError = error.message;

          // Keep as pending for retry, or set to failed if max retries exceeded
          action.actionData.retryCount = (action.actionData.retryCount || 0) + 1;

          if (action.actionData.retryCount > this.maxRetries) {
            action.status = 'failed';
            this.emit('action:failed', action);
          }

          await action.save();
        }
      }

      logger.info(`LinkedIn action processing complete: ${completed} queued, ${failed} failed`);

      this.isProcessing = false;

      // Return stats for monitoring
      return { total: actions.length, completed, failed };
    } catch (error) {
      logger.error('Error processing LinkedIn actions batch:', error);
      this.isProcessing = false;
      throw error;
    }
  }

  // Also update the executeAction method

  async executeAction(action) {
    try {
      // Double check if campaign is still running
      if (action.campaign.status !== 'running') {
        action.status = 'failed'; // Use 'failed' instead of 'cancelled'
        action.actionData = action.actionData || {};
        action.actionData.error = { message: 'Campaign is no longer running' };
        await action.save();
        return;
      }

      // Get LinkedIn account for this campaign's owner
      const linkedInAccount = await this.getLinkedInAccountForUser(action.campaign.owner);
      if (!linkedInAccount || !linkedInAccount._id) {
        throw new Error('No valid LinkedIn account found for campaign owner');
      }

      // Properly format the LinkedIn profile URL for the lead
      const profileUrl = this.getProfileUrl(action.lead);

      // Execute the appropriate action type based on action.type
      let result;
      switch (action.type) {
        case 'invite_sent':
          // For connection invites, we need to include the custom message
          result = await linkedinBrowserService.sendConnectionRequest(
            linkedInAccount._id,
            profileUrl,
            action.actionData.message
          );
          break;
        case 'message_sent':
          result = await linkedinBrowserService.sendMessage(
            linkedInAccount._id,
            profileUrl,
            action.actionData.message
          );
          break;
        case 'profile_viewed':
          result = await linkedinBrowserService.viewProfile(
            linkedInAccount._id,
            profileUrl
          );
          break;
        case 'profile_followed':
          result = await linkedinBrowserService.followProfile(
            linkedInAccount._id,
            profileUrl
          );
          break;
        case 'post_liked':
          result = await linkedinBrowserService.likePost(
            linkedInAccount._id,
            profileUrl
          );
          break;
        default:
          throw new Error(`Unsupported action type: ${action.type}`);
      }

      // Mark as completed and save execution time
      action.status = 'completed';
      action.executedAt = new Date();
      action.actionData = action.actionData || {};
      action.actionData.response = result.message || 'Action completed successfully';
      await action.save();

      // Update lead status based on action type
      await this.updateLeadStatus(action);

      // Schedule the next action in the sequence
      await this.scheduleNextAction(action);

      // Update campaign analytics
      await this.updateCampaignAnalytics(action.campaign._id);

      // Emit event for realtime updates
      this.emit('action:executed', {
        action: action.type,
        status: 'completed',
        campaignId: action.campaign._id,
        leadId: action.lead._id
      });

      return action;
    } catch (error) {
      logger.error(`Error executing LinkedIn action ${action._id}:`, error);

      // If this is a retry attempt, increment retry count
      if (!action.actionData) action.actionData = {};
      action.actionData.lastError = error.message;
      action.actionData.retryCount = (action.actionData.retryCount || 0) + 1;

      if (action.actionData.retryCount > this.maxRetries) {
        action.status = 'failed';
        this.emit('action:failed', action);
      } else {
        action.status = 'pending'; // Set back to pending for retry
        this.emit('action:retryScheduled', action);

        // Schedule retry with exponential backoff
        const retryDelay = Math.min(
          60 * 60 * 1000, // Max 1 hour
          (15 * 60 * 1000) * Math.pow(2, action.actionData.retryCount - 1) // Start with 15 min, then double
        );

        action.scheduledFor = new Date(Date.now() + retryDelay);
      }

      await action.save();

      throw error;
    }
  }

  // services/LinkedInActionService.js (continued)

  /**
   * Update lead status based on action type
   */
  async updateLeadStatus(action) {
    try {
      const updateData = { lastActionAt: new Date() };

      switch (action.type) {
        case 'invite_sent':
          updateData.status = 'invite_sent';
          break;
        case 'message_sent':
          updateData.status = 'message_sent';
          updateData.lastMessageSent = new Date();
          break;
        case 'profile_viewed':
          updateData.profileViewed = true;
          break;
        case 'profile_followed':
          updateData.profileFollowed = true;
          break;
        case 'post_liked':
          updateData.postLiked = true;
          break;
      }

      await Lead.findByIdAndUpdate(action.lead._id, { $set: updateData });
    } catch (error) {
      logger.error(`Error updating lead status for action ${action._id}:`, error);
    }
  }

  /**
   * Get properly formatted LinkedIn profile URL
   */
  getProfileUrl(lead) {
    if (!lead.linkedInId && !lead.linkedInUrl) {
      throw new Error('LinkedIn profile information missing for this lead');
    }

    // First try to use the linkedInUrl if it exists and is properly formatted
    if (lead.linkedInUrl && lead.linkedInUrl.startsWith('https://')) {
      return lead.linkedInUrl;
    }

    // Next, try to use linkedInId to construct the URL
    if (lead.linkedInId) {
      return `https://www.linkedin.com/in/${lead.linkedInId}/`;
    }

    // If linkedInUrl exists but is not properly formatted, try to format it
    if (lead.linkedInUrl) {
      if (lead.linkedInUrl.startsWith('www.')) {
        return `https://${lead.linkedInUrl}`;
      }

      // Handle case where only username is provided
      if (!lead.linkedInUrl.includes('linkedin.com')) {
        return `https://www.linkedin.com/in/${lead.linkedInUrl}/`;
      }

      // Handle case where http:// is used instead of https://
      if (lead.linkedInUrl.startsWith('http://')) {
        return lead.linkedInUrl.replace('http://', 'https://');
      }

      // If it has linkedin.com but no protocol, add it
      return `https://${lead.linkedInUrl}`;
    }

    throw new Error('Could not construct valid LinkedIn URL');
  }

  /**
   * Schedule the next action in the sequence
   * @param {CampaignAction} completedAction - The action that was just completed
   */
  async scheduleNextAction(completedAction) {
    try {
      // Fetch the campaign and sequence
      const campaign = await Campaign.findById(completedAction.campaign._id)
        .populate('sequence');

      if (!campaign || !campaign.sequence) {
        logger.warn(`No sequence found for campaign ${completedAction.campaign._id}`);
        return;
      }

      // Find the current action node in the sequence
      const currentNodeId = completedAction.sequenceNodeId || completedAction.actionData?.nodeId;
      if (!currentNodeId) {
        logger.warn(`No sequence node ID found for action ${completedAction._id}`);
        return;
      }

      // Find the current node
      const sequence = campaign.sequence;
      const nodes = sequence.nodes || [];
      const currentNodeIndex = nodes.findIndex(node => node.id === currentNodeId);

      if (currentNodeIndex === -1) {
        logger.warn(`Node ${currentNodeId} not found in sequence ${sequence._id}`);
        return;
      }

      // Find next node
      if (currentNodeIndex < nodes.length - 1) {
        const nextNode = nodes[currentNodeIndex + 1];
        let delay = 0;

        // Calculate delay for next action
        if (nextNode.type === 'delay') {
          // If it's a delay node, use its specified delay
          delay = nextNode.data?.delayTime || 24 * 60 * 60 * 1000; // Default to 1 day

          // If there's another node after the delay, that's the real next action
          if (currentNodeIndex + 2 < nodes.length) {
            await this.createNextAction(completedAction, nodes[currentNodeIndex + 2], delay);
          }
        } else {
          // For regular action nodes, use a default delay
          delay = this.getRandomDelay(4 * 60 * 60 * 1000, 24 * 60 * 60 * 1000); // 4-24 hours
          await this.createNextAction(completedAction, nextNode, delay);
        }

        logger.info(`Scheduled next action for lead ${completedAction.lead._id} with delay ${Math.round(delay / 1000 / 60)} minutes`);
      } else {
        logger.info(`Sequence completed for lead ${completedAction.lead._id}`);

        // Update lead to mark sequence as completed
        await Lead.findByIdAndUpdate(completedAction.lead._id, {
          $set: {
            sequenceCompleted: true,
            status: 'sequence_completed'
          }
        });
      }
    } catch (error) {
      logger.error(`Error scheduling next action for ${completedAction._id}:`, error);
    }
  }

  /**
   * Create the next action in the sequence
   * @param {CampaignAction} completedAction - The action that was just completed
   * @param {Object} nextNode - The next node in the sequence
   * @param {number} delay - Delay in milliseconds before executing the next action
   */
  async createNextAction(completedAction, nextNode, delay) {
    // Calculate scheduled time
    const scheduledFor = new Date(Date.now() + delay);

    // Map the sequence node type to action type
    let actionType;
    switch (nextNode.type) {
      case 'send_invite':
        actionType = 'invite_sent';
        break;
      case 'follow':
        actionType = 'profile_followed';
        break;
      case 'view':
        actionType = 'profile_viewed';
        break;
      case 'message':
        actionType = 'message_sent';
        break;
      case 'like':
        actionType = 'post_liked';
        break;
      default:
        actionType = nextNode.type;
    }

    // Create the next action
    const nextAction = new CampaignAction({
      campaign: completedAction.campaign._id,
      lead: completedAction.lead._id,
      type: actionType,
      status: 'pending',
      scheduledFor,
      actionData: {
        ...(nextNode.data || {}),
        nodeId: nextNode.id
      },
      sequenceNodeId: nextNode.id
    });

    // Personalize message if present
    if (nextNode.data?.message && completedAction.lead) {
      nextAction.actionData.message = this.personalizeMessage(
        nextNode.data.message,
        completedAction.lead
      );
    }

    await nextAction.save();

    // Emit event for new action scheduled
    this.emit('action:scheduled', nextAction);

    return nextAction;
  }

  /**
   * Personalize a message template with lead data
   */
  personalizeMessage(template, lead) {
    if (!template) return '';

    return template
      .replace(/{{first_name}}/g, lead.firstName || 'there')
      .replace(/{{last_name}}/g, lead.lastName || '')
      .replace(/{{company}}/g, lead.company || 'your company')
      .replace(/{{position}}/g, lead.position || 'your role')
      .replace(/{{industry}}/g, lead.industry || 'your industry')
      .replace(/{{location}}/g, lead.location || 'your location');
  }

  /**
   * Get a user's LinkedIn account
   */
  async getLinkedInAccountForUser(userId) {
    try {
      // Find the most recently used LinkedIn account for this user
      const account = await LinkedInAccount.findOne({
        user: userId,
        status: 'active'
      }).sort({ lastUsed: -1 });

      if (!account) {
        throw new Error(`No active LinkedIn account found for user ${userId}`);
      }

      return account;
    } catch (error) {
      logger.error(`Error getting LinkedIn account for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update campaign analytics based on action results
   */
  async updateCampaignAnalytics(campaignId) {
    try {
      // Aggregate actions to calculate analytics
      const actionCounts = await CampaignAction.aggregate([
        { $match: { campaign: campaignId, status: 'completed' } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]);

      // Convert to object format for easier access
      const counts = actionCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {});

      // Calculate rates
      const invitesSent = counts.invite_sent || 0;
      const invitesAccepted = counts.invite_accepted || 0;
      const messagesSent = counts.message_sent || 0;
      const messagesReplied = counts.message_replied || 0;
      const profilesViewed = counts.profile_viewed || 0;

      const acceptanceRate = invitesSent > 0 ? (invitesAccepted / invitesSent) * 100 : 0;
      const replyRate = messagesSent > 0 ? (messagesReplied / messagesSent) * 100 : 0;

      // Update campaign analytics
      await Campaign.findByIdAndUpdate(campaignId, {
        $set: {
          'analytics.invitesSent': invitesSent,
          'analytics.invitesAccepted': invitesAccepted,
          'analytics.messagesSent': messagesSent,
          'analytics.messagesReplied': messagesReplied,
          'analytics.profilesViewed': profilesViewed,
          'analytics.acceptanceRate': parseFloat(acceptanceRate.toFixed(2)),
          'analytics.replyRate': parseFloat(replyRate.toFixed(2)),
          'lastRunAt': new Date()
        }
      });
    } catch (error) {
      logger.error(`Error updating campaign analytics for ${campaignId}:`, error);
    }
  }
}

module.exports = new LinkedInActionService();