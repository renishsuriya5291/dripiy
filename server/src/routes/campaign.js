// Updated campaignRoutes.js with logger import
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Campaign = require('../models/Campaign');
const Lead = require('../models/Lead');
const Sequence = require('../models/Sequence');
const CampaignAction = require('../models/CampaignAction');
const initializeCampaignActions = require('../utils/initializeCampaignActions');
const logger = require('../utils/logger'); // Add missing logger import

// Create a new campaign
router.post('/', authMiddleware, async (req, res) => {
    try {
        const {
            name,
            description,
            sequenceId,
            filters,
            webhooks,
            settings,
            leadLists // Add leadLists parameter
        } = req.body;

        logger.info(`Creating campaign with sequence ${sequenceId}`);

        // Validate sequence exists
        const sequence = await Sequence.findOne({
            _id: sequenceId,
            owner: req.user.userId
        });

        if (!sequence) {
            return res.status(404).json({ error: 'Sequence not found' });
        }

        // Validate leadLists if provided
        if (leadLists && leadLists.length > 0) {
            // Add validation for leadLists if needed
            // For example, check if all the lead lists exist and belong to the user
        }

        const campaign = new Campaign({
            name,
            description,
            owner: req.user.userId,
            sequence: sequenceId,
            filters,
            webhooks,
            settings,
            leadLists: leadLists || [], // Set leadLists or empty array as default
            status: 'draft',
            analytics: {
                invitesSent: 0,
                invitesAccepted: 0,
                messagesSent: 0,
                repliesReceived: 0,
                connectionsMade: 0
            }
        });

        await campaign.save();
        logger.info(`Campaign created with ID ${campaign._id}`);
        res.status(201).json(campaign);
    } catch (err) {
        logger.error(`Error creating campaign: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

// Get all campaigns for a user
router.get('/', authMiddleware, async (req, res) => {
    try {
        const campaigns = await Campaign.find({ owner: req.user.userId })
            .populate('sequence', 'name')
            .populate('leadLists', 'name leadCount') // Add populate for leadLists
            .sort({ createdAt: -1 });
        res.json(campaigns);
    } catch (err) {
        logger.error(`Error getting campaigns: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

// Get a specific campaign
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const campaign = await Campaign.findOne({
            _id: req.params.id,
            owner: req.user.userId
        })
        .populate('sequence', 'name nodes edges')
        .populate('leadLists', 'name leadCount');

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        // Get campaign analytics
        const analytics = await Lead.aggregate([
            { $match: { campaign: campaign._id } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        campaign.analytics = analytics.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
        }, {});

        res.json(campaign);
    } catch (err) {
        logger.error(`Error getting campaign ${req.params.id}: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

// Get campaign actions
router.get('/:id/actions', authMiddleware, async (req, res) => {
    try {
        const campaign = await Campaign.findOne({
            _id: req.params.id,
            owner: req.user.userId
        });

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        logger.info(`Getting actions for campaign ${campaign._id}`);

        // Get the latest actions for this campaign
        const actions = await CampaignAction.find({ campaign: campaign._id })
            .sort({ createdAt: -1 })
            .limit(100)
            .populate('lead', 'firstName lastName company position');

        logger.info(`Found ${actions.length} actions for campaign ${campaign._id}`);
            
        // Group by status
        const groupedActions = {
            completed: actions.filter(a => a.status === 'completed'),
            pending: actions.filter(a => a.status === 'pending'),
            failed: actions.filter(a => a.status === 'failed')
        };

        res.json(groupedActions);
    } catch (err) {
        logger.error(`Error getting campaign actions: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

// Get campaign action stats
router.get('/:id/action-stats', authMiddleware, async (req, res) => {
    try {
        const campaign = await Campaign.findOne({
            _id: req.params.id,
            owner: req.user.userId
        });

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        // Get action stats for this campaign
        const stats = await CampaignAction.aggregate([
            { $match: { campaign: campaign._id } },
            { 
                $group: { 
                    _id: { type: '$type', status: '$status' },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Format stats into a more usable structure
        const formattedStats = {};
        
        stats.forEach(stat => {
            const { type, status } = stat._id;
            if (!formattedStats[type]) {
                formattedStats[type] = { total: 0 };
            }
            formattedStats[type][status] = stat.count;
            formattedStats[type].total += stat.count;
        });

        res.json(formattedStats);
    } catch (err) {
        logger.error(`Error getting campaign action stats: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

// Retry failed actions
router.post('/:id/retry-failed-actions', authMiddleware, async (req, res) => {
    try {
        const campaign = await Campaign.findOne({
            _id: req.params.id,
            owner: req.user.userId
        });

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        // Update status of failed actions back to pending
        const result = await CampaignAction.updateMany(
            { campaign: campaign._id, status: 'failed' },
            { 
                $set: { 
                    status: 'pending',
                    scheduledFor: new Date()
                }
            }
        );

        logger.info(`Retried ${result.modifiedCount} failed actions for campaign ${campaign._id}`);

        res.json({ 
            message: `${result.modifiedCount} failed actions scheduled for retry`,
            modifiedCount: result.modifiedCount
        });
    } catch (err) {
        logger.error(`Error retrying failed actions: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

// Update a campaign
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const {
            name,
            description,
            sequenceId,
            filters,
            webhooks,
            settings,
            status,
            leadLists // Add leadLists parameter
        } = req.body;

        const campaign = await Campaign.findOne({
            _id: req.params.id,
            owner: req.user.userId
        });

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        // Validate sequence if being updated
        if (sequenceId && sequenceId !== campaign.sequence.toString()) {
            const sequence = await Sequence.findOne({
                _id: sequenceId,
                owner: req.user.userId
            });

            if (!sequence) {
                return res.status(404).json({ error: 'Sequence not found' });
            }
            campaign.sequence = sequenceId;
        }

        // Update fields
        campaign.name = name || campaign.name;
        campaign.description = description || campaign.description;
        campaign.filters = filters || campaign.filters;
        campaign.webhooks = webhooks || campaign.webhooks;
        campaign.settings = settings || campaign.settings;
        campaign.status = status || campaign.status;
        campaign.leadLists = leadLists || campaign.leadLists; // Update leadLists
        campaign.updatedAt = new Date();

        await campaign.save();
        res.json(campaign);
    } catch (err) {
        logger.error(`Error updating campaign: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

// Delete a campaign
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const campaign = await Campaign.findOne({
            _id: req.params.id,
            owner: req.user.userId
        }).populate('leadLists');

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        // Delete associated leads in all lead lists
        for (const leadList of campaign.leadLists) {
            if (leadList.leads && leadList.leads.length > 0) {
                await Lead.deleteMany({ _id: { $in: leadList.leads } });
            }
        }

        // Delete associated lead lists
        const leadListIds = campaign.leadLists.map(list => list._id);
        if (leadListIds.length > 0) {
            await require('../models/LeadList').deleteMany({ _id: { $in: leadListIds } });
        }

        // Delete associated sequence
        if (campaign.sequence) {
            await Sequence.deleteOne({ _id: campaign.sequence });
        }

        // Delete campaign actions
        await CampaignAction.deleteMany({ campaign: campaign._id });

        // Delete the campaign
        await Campaign.deleteOne({ _id: campaign._id });

        res.json({ message: 'Campaign, associated lead lists, leads, sequence, and actions deleted successfully' });
    } catch (err) {
        logger.error(`Error deleting campaign: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

// Start a campaign
router.post('/:id/start', authMiddleware, async (req, res) => {
    try {
        // Fetch campaign and populate leadLists
        const campaign = await Campaign.findOne({
            _id: req.params.id,
            owner: req.user.userId
        }).populate('leadLists').populate('sequence');

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        if (campaign.status === 'running') {
            return res.status(400).json({ error: 'Campaign is already running' });
        }

        // Validate campaign has lead lists
        if (!campaign.leadLists || campaign.leadLists.length === 0) {
            return res.status(400).json({ error: 'Campaign has no lead lists' });
        }

        // Validate campaign has a sequence
        if (!campaign.sequence) {
            return res.status(400).json({ error: 'Campaign has no sequence' });
        }

        logger.info(`Starting campaign ${campaign._id}`);

        // Update campaign status to running
        campaign.status = 'running';
        campaign.startedAt = new Date();
        await campaign.save();

        // Initialize campaign actions
        const actionsInitialized = await initializeCampaignActions(campaign._id);
        
        if (!actionsInitialized) {
            logger.warn(`Failed to initialize actions for campaign ${campaign._id}`);
            return res.status(200).json({ 
                message: 'Campaign started, but there was an issue initializing actions. Please check the logs.',
                campaign
            });
        }
        
        logger.info(`Campaign ${campaign._id} started successfully with actions initialized`);
        res.json({ 
            message: 'Campaign started successfully with actions initialized', 
            campaign
        });
    } catch (err) {
        logger.error(`Error starting campaign: ${err.message}`, err);
        res.status(500).json({ error: err.message });
    }
});

// Pause a campaign
router.post('/:id/pause', authMiddleware, async (req, res) => {
    try {
        const campaign = await Campaign.findOne({
            _id: req.params.id,
            owner: req.user.userId
        });

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        if (campaign.status !== 'running') {
            return res.status(400).json({ error: 'Campaign is not running' });
        }

        campaign.status = 'paused';
        campaign.pausedAt = new Date();
        await campaign.save();

        logger.info(`Campaign ${campaign._id} paused`);

        res.json({ message: 'Campaign paused successfully', campaign });
    } catch (err) {
        logger.error(`Error pausing campaign: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

// Stop a campaign
router.post('/:id/stop', authMiddleware, async (req, res) => {
    try {
        const campaign = await Campaign.findOne({
            _id: req.params.id,
            owner: req.user.userId
        });

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        if (campaign.status === 'stopped') {
            return res.status(400).json({ error: 'Campaign is already stopped' });
        }

        campaign.status = 'stopped';
        campaign.stoppedAt = new Date();
        await campaign.save();

        logger.info(`Campaign ${campaign._id} stopped`);

        res.json({ message: 'Campaign stopped successfully', campaign });
    } catch (err) {
        logger.error(`Error stopping campaign: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

// Add leads to campaign
router.post('/:id/add-leads', authMiddleware, async (req, res) => {
    try {
        const { leadListIds } = req.body;
        
        if (!leadListIds || !Array.isArray(leadListIds) || leadListIds.length === 0) {
            return res.status(400).json({ error: 'Lead list IDs are required' });
        }

        const campaign = await Campaign.findOne({
            _id: req.params.id,
            owner: req.user.userId
        });

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        // Add the lead lists to the campaign
        // First, make sure we don't add duplicates
        const currentLeadLists = campaign.leadLists || [];
        const newLeadLists = [...new Set([...currentLeadLists.map(id => id.toString()), ...leadListIds])];
        
        campaign.leadLists = newLeadLists;
        campaign.updatedAt = new Date();
        
        await campaign.save();
        
        res.json({ message: 'Lead lists added to campaign successfully', campaign });
    } catch (err) {
        logger.error(`Error adding leads to campaign: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;