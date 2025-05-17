// utils/initializeCampaignActions.js
const mongoose = require('mongoose');
const Campaign = require('../models/Campaign');
const Lead = require('../models/Lead');
const LeadList = require('../models/LeadList');
const CampaignAction = require('../models/CampaignAction');
const Sequence = require('../models/Sequence');
const logger = require('../utils/logger');

/**
 * Initialize actions for a campaign when it's started
 * Creates the necessary CampaignAction documents based on the sequence
 * @param {string} campaignId - The ID of the campaign to initialize
 * @returns {Promise<boolean>} - Success or failure
 */
async function initializeCampaignActions(campaignId) {
  try {
    logger.info(`Initializing actions for campaign ${campaignId}`);
    
    // Get the campaign
    const campaign = await Campaign.findById(campaignId);
    
    if (!campaign) {
      logger.error(`Campaign ${campaignId} not found`);
      return false;
    }
    
    // Check if sequence exists and load it directly
    if (!campaign.sequence) {
      logger.error(`Campaign ${campaignId} has no sequence defined`);
      return false;
    }
    
    // Load the sequence with all nodes and edges
    const sequence = await Sequence.findById(campaign.sequence);
    
    if (!sequence) {
      logger.error(`Sequence ${campaign.sequence} not found for campaign ${campaignId}`);
      return false;
    }
    
    logger.info(`Found sequence "${sequence.name}" for campaign ${campaignId}`);
    
    // Get the sequence nodes and edges
    const { nodes, edges } = sequence;
    
    if (!nodes || nodes.length === 0) {
      logger.error(`Sequence has no nodes for campaign ${campaignId}`);
      return false;
    }
    
    logger.info(`Sequence has ${nodes.length} nodes and ${edges.length} edges`);

    // Load all lead lists for this campaign
    const leadLists = await LeadList.find({
      _id: { $in: campaign.leadLists }
    });
    
    if (!leadLists || leadLists.length === 0) {
      logger.error(`No lead lists found for campaign ${campaignId}`);
      return false;
    }
    
    // Get all leads from all lead lists
    let leads = [];
    
    // First try to get leads directly from the lead lists
    for (const leadList of leadLists) {
      if (leadList.leads && leadList.leads.length > 0) {
        // Get leads from lead list
        const leadsInList = await Lead.find({ 
          _id: { $in: leadList.leads } 
        });
        
        if (leadsInList && leadsInList.length > 0) {
          leads = [...leads, ...leadsInList];
        }
      }
    }
    
    // If no leads found in lead lists directly, try to find leads by leadList reference
    if (leads.length === 0) {
      const leadListIds = leadLists.map(list => list._id);
      leads = await Lead.find({ leadList: { $in: leadListIds } });
    }
    
    if (!leads || leads.length === 0) {
      logger.error(`No leads found for campaign ${campaignId}`);
      return false;
    }
    
    logger.info(`Found ${leads.length} leads across ${leadLists.length} lead lists for campaign ${campaignId}`);

    // Delete any existing pending actions for this campaign to avoid duplicates
    const deleteResult = await CampaignAction.deleteMany({ 
      campaign: campaignId,
      status: 'pending'
    });
    
    logger.info(`Deleted ${deleteResult.deletedCount} existing pending actions for campaign ${campaignId}`);
    
    // Find the start node in the sequence
    const startNode = nodes.find(node => node.type === 'start');
    
    if (!startNode) {
      logger.error(`No start node found in sequence for campaign ${campaignId}`);
      return false;
    }
    
    // Find edges that connect from the start node to determine the first action
    const firstEdge = edges.find(edge => edge.source === startNode.id);
    
    if (!firstEdge) {
      logger.error(`No edges from start node in sequence for campaign ${campaignId}`);
      return false;
    }
    
    // Find the first action node using the target of the first edge
    const firstActionNode = nodes.find(node => node.id === firstEdge.target);
    
    if (!firstActionNode) {
      logger.error(`First action node not found in sequence for campaign ${campaignId}`);
      return false;
    }
    
    logger.info(`First action node is ${firstActionNode.type} (ID: ${firstActionNode.id}) for campaign ${campaignId}`);
    
    // Create a new action for each lead
    const actionsCreated = [];
    const startTime = new Date();
    let scheduledTime = new Date(startTime);
    
    // Process in batches to avoid overloading the database
    const batchSize = 50;
    
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      
      // Add a small delay (2 min between each action) to prevent overwhelming LinkedIn
      scheduledTime = new Date(startTime.getTime() + (i * 2 * 60000)); // 2 minute intervals
      
      // Map the node type from sequence to action type for CampaignAction
      let actionType;
      switch (firstActionNode.type) {
        case 'send_invite':
          actionType = 'invite_sent';
          break;
        case 'send_message':
          actionType = 'message_sent';
          break;
        case 'view_profile':
          actionType = 'profile_viewed';
          break;
        case 'endorse_skills':
          actionType = 'skills_endorsed';
          break;
        case 'like_post':
          actionType = 'post_liked';
          break;
        case 'follow':
          actionType = 'profile_followed';
          break;
        case 'send_email':
          actionType = 'email_sent';
          break;
        default:
          // Use the same type if it's not a special case
          actionType = firstActionNode.type;
      }
      
      // Create the action data based on node type and data
      let actionData = {
        nodeId: firstActionNode.id
      };
      
      // Add message if it exists in the node data
      if (firstActionNode.data && firstActionNode.data.message) {
        // Personalize message with lead data
        let personalizedMessage = firstActionNode.data.message;
        
        // Replace placeholders with actual values
        if (lead.firstName) personalizedMessage = personalizedMessage.replace(/{{first_name}}/g, lead.firstName);
        if (lead.lastName) personalizedMessage = personalizedMessage.replace(/{{last_name}}/g, lead.lastName);
        if (lead.company) personalizedMessage = personalizedMessage.replace(/{{company}}/g, lead.company);
        if (lead.position) personalizedMessage = personalizedMessage.replace(/{{position}}/g, lead.position);
        
        // Replace any remaining placeholders with defaults
        personalizedMessage = personalizedMessage
          .replace(/{{first_name}}/g, 'there')
          .replace(/{{last_name}}/g, '')
          .replace(/{{company}}/g, 'your company')
          .replace(/{{position}}/g, 'your role');
        
        actionData.message = personalizedMessage;
      }
      
      // Add subject if it exists (for emails or InMails)
      if (firstActionNode.data && firstActionNode.data.subject) {
        actionData.subject = firstActionNode.data.subject;
      }
      
      // Create the action record
      const action = new CampaignAction({
        campaign: campaignId,
        lead: lead._id,
        type: actionType,
        status: 'pending',
        actionData,
        scheduledFor: scheduledTime,
        createdAt: new Date()
      });
      
      await action.save();
      actionsCreated.push(action);
      
      // Also associate the lead with this campaign
      await Lead.findByIdAndUpdate(lead._id, {
        campaign: campaignId,
        status: 'pending'
      });
      
      // Log progress for every batch
      if (actionsCreated.length % batchSize === 0 || i === leads.length - 1) {
        logger.info(`Created ${actionsCreated.length}/${leads.length} actions for campaign ${campaignId}`);
      }
    }
    
    logger.info(`Successfully created ${actionsCreated.length} actions for campaign ${campaignId}`);
    
    // Update campaign with action count
    await Campaign.findByIdAndUpdate(campaignId, {
      $set: {
        'analytics.pendingActions': actionsCreated.length,
        lastUpdatedAt: new Date()
      }
    });
    
    return true;
    
  } catch (error) {
    logger.error(`Error initializing actions for campaign ${campaignId}:`, error);
    return false;
  }
}

module.exports = initializeCampaignActions;