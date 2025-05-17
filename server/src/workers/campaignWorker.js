// services/CampaignWorker.js
const cron = require('node-cron');
const mongoose = require('mongoose');
const linkedinActionService = require('../services/linkedinActionService');
const Campaign = require('../models/Campaign');
const CampaignAction = require('../models/CampaignAction');
const Lead = require('../models/Lead');
const logger = require('../utils/logger');

class CampaignWorker {
  constructor() {
    // Process actions more frequently (every 5 minutes)
    this.scheduler = null;
    this.healthChecker = null;
    this.actionGenerator = null;
    this.statsReporter = null;

    // Track if the worker is running
    this.isRunning = false;
  }

  /**
   * Start the worker
   */
  async start() {
    if (this.isRunning) {
      logger.info('Campaign worker already running');
      return;
    }

    logger.info('Starting campaign worker');

    // Initialize LinkedIn Action Service
    await linkedinActionService.initialize();

    // Schedule the worker to run more frequently in development
    const actionInterval = process.env.NODE_ENV === 'production' ? '*/10 * * * *' : '*/5 * * * *';
    this.scheduler = cron.schedule(actionInterval, () => {
      this.processActions().catch(err => {
        logger.error('Error in campaign worker:', err);
      });
    });

    // Run health checks less frequently
    this.healthChecker = cron.schedule('0 */2 * * *', () => {
      this.checkCampaignHealth().catch(err => {
        logger.error('Error in campaign health checker:', err);
      });
    });

    // Generate actions less frequently
    this.actionGenerator = cron.schedule('0 */8 * * *', () => {
      this.scheduleNewActions().catch(err => {
        logger.error('Error in action generator:', err);
      });
    });

    // Stats less frequently
    this.statsReporter = cron.schedule('0 */12 * * *', () => {
      this.reportCampaignStats().catch(err => {
        logger.error('Error in stats reporter:', err);
      });
    });

    // Start all schedules
    this.scheduler.start();
    this.healthChecker.start();
    this.actionGenerator.start();
    this.statsReporter.start();

    // Run initial action processing after a short delay
    setTimeout(() => {
      this.processActions().catch(err => {
        logger.error('Error in initial campaign worker run:', err);
      });

      // Generate new actions initially 
      this.scheduleNewActions().catch(err => {
        logger.error('Error in initial action generation:', err);
      });
    }, 15000);

    this.isRunning = true;
    logger.info('Campaign worker initialized');
  }

  /**
   * Stop the worker
   */
  async stop() {
    logger.info('Stopping campaign worker');

    if (this.scheduler) {
      this.scheduler.stop();
      this.scheduler = null;
    }

    if (this.healthChecker) {
      this.healthChecker.stop();
      this.healthChecker = null;
    }

    if (this.actionGenerator) {
      this.actionGenerator.stop();
      this.actionGenerator = null;
    }

    if (this.statsReporter) {
      this.statsReporter.stop();
      this.statsReporter = null;
    }

    this.isRunning = false;

    // Shutdown the action service
    await linkedinActionService.shutdown();
  }

  /**
   * Process pending LinkedIn actions
   */
  async processActions() {
    try {
      logger.info('Campaign worker: Processing pending actions');

      // Process a batch of actions
      const result = await linkedinActionService.processPendingActions(20);
      logger.info(`Processed ${result.total} actions: ${result.completed} completed, ${result.failed} failed`);

      return result;
    } catch (error) {
      logger.error('Error processing campaign actions:', error);
      throw error;
    }
  }

  /**
   * Schedule new actions for running campaigns
   */
  async scheduleNewActions() {
    try {
      logger.info('Campaign worker: Scheduling new actions');

      // Find all running campaigns
      const runningCampaigns = await Campaign.find({ status: 'running' });

      if (runningCampaigns.length === 0) {
        logger.info('No running campaigns found');
        return;
      }

      logger.info(`Found ${runningCampaigns.length} running campaigns`);

      // Distribute lead processing across campaigns to avoid overwhelming LinkedIn
      // Process campaigns one at a time with a small delay between each
      for (const campaign of runningCampaigns) {
        try {
          // Process this campaign
          await this.scheduleActionsForCampaign(campaign);

          // Add a small delay between campaigns
          await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (campaignError) {
          logger.error(`Error scheduling actions for campaign ${campaign._id}:`, campaignError);
          // Continue with next campaign
        }
      }

      logger.info('Finished scheduling new actions for all campaigns');
    } catch (error) {
      logger.error('Error scheduling new campaign actions:', error);
      throw error;
    }
  }

  /**
   * Schedule actions for a single campaign
   * @param {Campaign} campaign - The campaign to schedule actions for
   */
  async scheduleActionsForCampaign(campaign) {
    try {
      logger.info(`Scheduling actions for campaign ${campaign._id}`);

      // Check if the campaign has a sequence
      if (!campaign.sequence) {
        logger.warn(`Campaign ${campaign._id} has no sequence defined`);
        return;
      }

      // Find leads that need actions
      const leads = await Lead.find({
        campaign: campaign._id,
        // Find leads without recent actions or with specific statuses
        $or: [
          { status: 'new' },
          {
            status: 'invite_sent',
            lastActionAt: { $lt: new Date(Date.now() - 86400000 * 3) } // 3 days ago
          },
          {
            status: 'message_sent',
            lastActionAt: { $lt: new Date(Date.now() - 86400000 * 5) } // 5 days ago
          }
        ]
      })
        .limit(20); // Process in smaller batches

      if (leads.length === 0) {
        logger.info(`No leads need actions for campaign ${campaign._id}`);
        return;
      }

      logger.info(`Found ${leads.length} leads that need actions for campaign ${campaign._id}`);

      // Get the sequence for this campaign
      const sequence = await this.getSequenceForCampaign(campaign._id);

      if (!sequence || !sequence.nodes || sequence.nodes.length === 0) {
        logger.warn(`No valid sequence found for campaign ${campaign._id}`);
        return;
      }

      // Schedule appropriate actions for leads
      let scheduledCount = 0;

      for (const lead of leads) {
        try {
          // Check if we already have pending actions for this lead
          const pendingActions = await CampaignAction.countDocuments({
            lead: lead._id,
            status: 'pending'
          });

          if (pendingActions > 0) {
            logger.info(`Skipping lead ${lead._id} - already has ${pendingActions} pending actions`);
            continue;
          }

          // Schedule next action for this lead
          const actionScheduled = await this.scheduleNextActionForLead(campaign, lead, sequence);

          if (actionScheduled) {
            scheduledCount++;
          }

          // Small delay between leads to avoid database spikes
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (leadError) {
          logger.error(`Error scheduling action for lead ${lead._id}:`, leadError);
          // Continue with next lead
        }
      }

      logger.info(`Scheduled ${scheduledCount} new actions for campaign ${campaign._id}`);
    } catch (error) {
      logger.error(`Error scheduling actions for campaign ${campaign._id}:`, error);
      throw error;
    }
  }

  /**
   * Schedule the next action for a lead based on campaign sequence
   * @param {Campaign} campaign - The campaign
   * @param {Lead} lead - The lead to schedule an action for
   * @param {Object} sequence - The campaign sequence
   * @returns {boolean} True if an action was scheduled
   */
  async scheduleNextActionForLead(campaign, lead, sequence) {
    try {
      // Determine which action to take next based on lead status
      let actionScheduled = false;

      switch (lead.status) {
        case 'new':
          // First action is usually to send a connection request
          const inviteNode = sequence.nodes.find(node =>
            node.type === 'send_invite' || node.type === 'invite_sent'
          );

          if (inviteNode) {
            await this.createInviteAction(campaign, lead, inviteNode);
            actionScheduled = true;
          } else {
            // If no invite node, look for profile view node
            const viewNode = sequence.nodes.find(node =>
              node.type === 'view' || node.type === 'profile_viewed'
            );

            if (viewNode) {
              await this.createViewAction(campaign, lead, viewNode);
              actionScheduled = true;
            }
          }
          break;

        case 'invite_sent':
          // Check if enough time has passed to follow up
          const inviteSentDays = lead.lastActionAt
            ? Math.floor((Date.now() - lead.lastActionAt) / (24 * 60 * 60 * 1000))
            : 999;

          if (inviteSentDays >= 3) {
            // After 3 days, check if we should follow up with a message for connected leads
            if (lead.connectionStatus === 'connected') {
              const messageNode = sequence.nodes.find(node =>
                node.type === 'message' || node.type === 'send_message' || node.type === 'message_sent'
              );

              if (messageNode) {
                await this.createMessageAction(campaign, lead, messageNode);
                actionScheduled = true;
              }
            } else {
              // Not connected yet, check if we should try another invite or view profile
              const viewNode = sequence.nodes.find(node =>
                node.type === 'view' || node.type === 'profile_viewed'
              );

              if (viewNode) {
                await this.createViewAction(campaign, lead, viewNode);
                actionScheduled = true;
              }
            }
          }
          break;

        case 'message_sent':
          // Check if enough time has passed for a follow-up message
          const messageSentDays = lead.lastActionAt
            ? Math.floor((Date.now() - lead.lastActionAt) / (24 * 60 * 60 * 1000))
            : 999;

          if (messageSentDays >= 5) {
            // Find a follow-up message node that's different from the last one used
            const followUpNodes = sequence.nodes.filter(node =>
              (node.type === 'message' || node.type === 'send_message' || node.type === 'message_sent') &&
              node.id !== lead.lastActionNodeId
            );

            if (followUpNodes.length > 0) {
              // Use the next message in sequence
              await this.createMessageAction(campaign, lead, followUpNodes[0]);
              actionScheduled = true;
            }
          }
          break;

        case 'connected':
          // Lead is connected but no message sent yet
          const messageNode = sequence.nodes.find(node =>
            node.type === 'message' || node.type === 'send_message' || node.type === 'message_sent'
          );

          if (messageNode) {
            await this.createMessageAction(campaign, lead, messageNode);
            actionScheduled = true;
          }
          break;

        default:
          // For other statuses, check if we should view profile or take other actions
          const viewNode = sequence.nodes.find(node =>
            node.type === 'view' || node.type === 'profile_viewed'
          );

          if (viewNode && !lead.profileViewed) {
            await this.createViewAction(campaign, lead, viewNode);
            actionScheduled = true;
          }
          break;
      }

      return actionScheduled;
    } catch (error) {
      logger.error(`Error scheduling action for lead ${lead._id}:`, error);
      throw error;
    }
  }

  /**
   * Create an invite action
   * @param {Campaign} campaign - Campaign object
   * @param {Lead} lead - Lead object
   * @param {Object} node - Sequence node
   */
  async createInviteAction(campaign, lead, node) {
    // Calculate a randomized future time (within next 24 hours)
    const scheduledTime = this.getRandomFutureTime(1, 24);

    const message = node.data?.message || "I'd like to connect with you on LinkedIn";

    const action = new CampaignAction({
      campaign: campaign._id,
      lead: lead._id,
      type: 'invite_sent',
      status: 'pending', // Make sure this is an allowed value
      actionData: {
        message: this.personalizeMessage(message, lead),
        nodeId: node.id
      },
      scheduledFor: scheduledTime,
      sequenceNodeId: node.id
    });

    await action.save();
    logger.info(`Scheduled invite action for lead ${lead._id} in campaign ${campaign._id} at ${scheduledTime.toISOString()}`);
  }

  /**
   * Create a message action
   * @param {Campaign} campaign - Campaign object
   * @param {Lead} lead - Lead object
   * @param {Object} node - Sequence node
   */
  async createMessageAction(campaign, lead, node) {
    // Determine when to send the message - default to 1-48 hours in future
    const delay = node.data?.delay || 1; // Default to 1 day delay
    const minHours = delay * 24 - 12; // 12 hours before the day
    const maxHours = delay * 24 + 12; // 12 hours after the day

    const scheduledTime = this.getRandomFutureTime(minHours, maxHours);

    const message = node.data?.message || "Hello! I wanted to follow up on our connection.";

    const action = new CampaignAction({
      campaign: campaign._id,
      lead: lead._id,
      type: 'message_sent',
      status: 'pending',
      actionData: {
        message: this.personalizeMessage(message, lead),
        nodeId: node.id
      },
      scheduledFor: scheduledTime,
      sequenceNodeId: node.id
    });

    await action.save();
    logger.info(`Scheduled message action for lead ${lead._id} in campaign ${campaign._id} at ${scheduledTime.toISOString()}`);
  }

  /**
   * Create a profile view action
   * @param {Campaign} campaign - Campaign object
   * @param {Lead} lead - Lead object
   * @param {Object} node - Sequence node
   */
  async createViewAction(campaign, lead, node) {
    // Schedule for a random time in next 24 hours
    const scheduledTime = this.getRandomFutureTime(1, 24);

    const action = new CampaignAction({
      campaign: campaign._id,
      lead: lead._id,
      type: 'profile_viewed',
      status: 'pending',
      actionData: {
        nodeId: node.id
      },
      scheduledFor: scheduledTime,
      sequenceNodeId: node.id
    });

    await action.save();
    logger.info(`Scheduled profile view action for lead ${lead._id} in campaign ${campaign._id} at ${scheduledTime.toISOString()}`);
  }

  /**
   * Get a random future time for scheduling actions
   * @param {number} minHours - Minimum hours in future
   * @param {number} maxHours - Maximum hours in future
   * @returns {Date} Scheduled time
   */
  getRandomFutureTime(minHours, maxHours) {
    const now = new Date();

    // Calculate random delay in milliseconds
    const minDelay = minHours * 60 * 60 * 1000;
    const maxDelay = maxHours * 60 * 60 * 1000;
    const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

    // Create scheduled time
    const scheduledTime = new Date(now.getTime() + randomDelay);

    // Restrict to business hours (8am-6pm) approximately
    const hour = scheduledTime.getHours();
    if (hour < 8) {
      scheduledTime.setHours(8 + Math.floor(Math.random() * 3)); // 8-10am
    } else if (hour > 18) {
      // Set to next day morning
      scheduledTime.setDate(scheduledTime.getDate() + 1);
      scheduledTime.setHours(8 + Math.floor(Math.random() * 3)); // 8-10am
    }

    return scheduledTime;
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
      .replace(/{{location}}/g, lead.location || 'your location')
      .replace(/{{connection_duration}}/g, lead.connectionDuration || 'a while');
  }

  /**
   * Get the sequence for a campaign
   */
  async getSequenceForCampaign(campaignId) {
    // In your actual app, fetch from database with population
    const campaign = await Campaign.findById(campaignId).populate('sequence');
    return campaign?.sequence;
  }

  /**
   * Check campaign health and handle issues
   */
  async checkCampaignHealth() {
    try {
      logger.info('Checking campaign health');

      const runningCampaigns = await Campaign.find({ status: 'running' });

      for (const campaign of runningCampaigns) {
        // Count failures for this campaign in the last 24 hours
        const failedActionsCount = await CampaignAction.countDocuments({
          campaign: campaign._id,
          status: 'failed',
          createdAt: { $gt: new Date(Date.now() - 86400000) } // Last 24 hours
        });

        // Check completion rate
        const totalActionsCount = await CampaignAction.countDocuments({
          campaign: campaign._id,
          status: { $in: ['completed', 'failed'] },
          createdAt: { $gt: new Date(Date.now() - 86400000) } // Last 24 hours
        });

        const failureRate = totalActionsCount > 0 ? (failedActionsCount / totalActionsCount) * 100 : 0;

        // If failure rate is too high, pause the campaign
        if (totalActionsCount >= 10 && failureRate > 50) {
          logger.warn(`Pausing campaign ${campaign._id} due to high failure rate (${failureRate.toFixed(2)}%)`);

          // Pause the campaign
          await Campaign.findByIdAndUpdate(campaign._id, {
            $set: {
              status: 'paused',
              pausedAt: new Date(),
              pauseReason: `High failure rate (${failureRate.toFixed(2)}%)`
            }
          });

          // Create a system notification for the user
          await this.createCampaignPausedNotification(campaign, failedActionsCount, failureRate);
        }
        // Check for LinkedIn rate limits
        else if (failedActionsCount > 5 && failedActionsCount === totalActionsCount) {
          // All actions failing may indicate account problems or rate limits
          logger.warn(`Pausing campaign ${campaign._id} due to consecutive failures (${failedActionsCount})`);
          // services/CampaignWorker.js (continued)

          await Campaign.findByIdAndUpdate(campaign._id, {
            $set: {
              status: 'paused',
              pausedAt: new Date(),
              pauseReason: 'Consecutive action failures - possible LinkedIn restrictions'
            }
          });

          await this.createLinkedInLimitNotification(campaign);
        }
      }

      logger.info('Campaign health check completed');
    } catch (error) {
      logger.error('Error checking campaign health:', error);
      throw error;
    }
  }

  /**
   * Report campaign statistics
   */
  async reportCampaignStats() {
    try {
      logger.info('Generating campaign statistics report');

      // Get all active campaigns
      const activeCampaigns = await Campaign.find({
        status: { $in: ['running', 'paused'] }
      });

      if (activeCampaigns.length === 0) {
        logger.info('No active campaigns to report on');
        return;
      }

      // Generate statistics for each campaign
      for (const campaign of activeCampaigns) {
        try {
          // Get action counts for last 24 hours
          const last24Hours = new Date(Date.now() - 86400000);

          const stats = await CampaignAction.aggregate([
            {
              $match: {
                campaign: campaign._id,
                createdAt: { $gt: last24Hours }
              }
            },
            {
              $group: {
                _id: '$type',
                completed: {
                  $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                },
                failed: {
                  $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
                },
                pending: {
                  $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                },
                total: { $sum: 1 }
              }
            }
          ]);

          // Convert to more readable format
          const formattedStats = {};

          stats.forEach(item => {
            formattedStats[item._id] = {
              completed: item.completed,
              failed: item.failed,
              pending: item.pending,
              total: item.total,
              successRate: item.total > 0 ? (item.completed / item.total) * 100 : 0
            };
          });

          // Get lead counts
          const leadCounts = await Lead.aggregate([
            {
              $match: {
                campaign: campaign._id
              }
            },
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 }
              }
            }
          ]);

          const leadStats = {};
          leadCounts.forEach(item => {
            leadStats[item._id] = item.count;
          });

          // Log statistics
          logger.info(`Campaign ${campaign._id} (${campaign.name}) statistics:`);
          logger.info(`- Action stats: ${JSON.stringify(formattedStats)}`);
          logger.info(`- Lead stats: ${JSON.stringify(leadStats)}`);

          // Update campaign with latest stats
          await Campaign.findByIdAndUpdate(campaign._id, {
            $set: {
              'stats.actions': formattedStats,
              'stats.leads': leadStats,
              'stats.lastUpdated': new Date()
            }
          });
        } catch (error) {
          logger.error(`Error generating stats for campaign ${campaign._id}:`, error);
        }
      }

      logger.info('Campaign statistics report completed');
    } catch (error) {
      logger.error('Error reporting campaign stats:', error);
      throw error;
    }
  }

  /**
   * Create a notification about a paused campaign
   */
  async createCampaignPausedNotification(campaign, failures, failureRate) {
    // Implement your notification system here
    logger.info(`Created notification for user ${campaign.owner} about paused campaign ${campaign._id} (${failureRate.toFixed(2)}% failure rate)`);

    // Example implementation:
    // const notification = new Notification({
    //   user: campaign.owner,
    //   type: 'campaign_paused',
    //   title: 'Campaign Paused Due to Errors',
    //   message: `Your campaign "${campaign.name}" has been paused due to a high failure rate (${failureRate.toFixed(2)}%). Please check the campaign settings and LinkedIn account.`,
    //   data: {
    //     campaignId: campaign._id,
    //     failures: failures,
    //     failureRate: failureRate
    //   },
    //   read: false
    // });
    // await notification.save();
  }

  /**
   * Create a notification about LinkedIn limits
   */
  async createLinkedInLimitNotification(campaign) {
    // Implement your notification system here
    logger.info(`Created LinkedIn limits notification for user ${campaign.owner} about campaign ${campaign._id}`);

    // Example implementation:
    // const notification = new Notification({
    //   user: campaign.owner,
    //   type: 'linkedin_limits',
    //   title: 'LinkedIn Limits Detected',
    //   message: `Your campaign "${campaign.name}" has been paused due to possible LinkedIn rate limits or restrictions. Please check your LinkedIn account status.`,
    //   data: {
    //     campaignId: campaign._id
    //   },
    //   read: false
    // });
    // await notification.save();
  }
}

module.exports = new CampaignWorker();