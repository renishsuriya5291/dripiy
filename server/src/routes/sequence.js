const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Sequence = require('../models/Sequence');

// Create a new sequence
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { name, description, nodes, edges } = req.body;
        const sequence = new Sequence({
            name,
            description,
            owner: req.user.userId,
            nodes,
            edges
        });
        await sequence.save();
        res.status(201).json(sequence);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all sequences for a user
router.get('/', authMiddleware, async (req, res) => {
    try {
        const sequences = await Sequence.find({ owner: req.user.userId })
            .sort({ createdAt: -1 });
        res.json(sequences);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get a specific sequence
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const sequence = await Sequence.findOne({
            _id: req.params.id,
            owner: req.user.userId
        });
        console.log('Sequence:', req.params.id);
        console.log('userid:',  req.user.userId);
        
        if (!sequence) {
            return res.status(404).json({ error: 'Sequence not found' });
        }
        
        res.json(sequence);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update a sequence
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { name, description, nodes, edges } = req.body;
        const sequence = await Sequence.findOne({
            _id: req.params.id,
            owner: req.user.userId
        });

        if (!sequence) {
            return res.status(404).json({ error: 'Sequence not found' });
        }

        sequence.name = name || sequence.name;
        sequence.description = description || sequence.description;
        sequence.nodes = nodes || sequence.nodes;
        sequence.edges = edges || sequence.edges;
        sequence.updatedAt = new Date();

        await sequence.save();
        res.json(sequence);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a sequence
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const sequence = await Sequence.findOne({
            _id: req.params.id,
            owner: req.user.userId
        });

        if (!sequence) {
            return res.status(404).json({ error: 'Sequence not found' });
        }

        await sequence.remove();
        res.json({ message: 'Sequence deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Clone a sequence
router.post('/:id/clone', authMiddleware, async (req, res) => {
    try {
        const sequence = await Sequence.findOne({
            _id: req.params.id,
            owner: req.user.userId
        });

        if (!sequence) {
            return res.status(404).json({ error: 'Sequence not found' });
        }

        const clonedSequence = new Sequence({
            name: `${sequence.name} (Copy)`,
            description: sequence.description,
            owner: req.user.userId,
            nodes: sequence.nodes,
            edges: sequence.edges
        });

        await clonedSequence.save();
        res.status(201).json(clonedSequence);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
