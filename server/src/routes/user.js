// Updated routes/user.js file with working hours implementation

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const logger = require('../utils/logger');
const bcrypt = require('bcrypt');

// Get user settings
router.get('/settings', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .select('settings workingHours');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            settings: user.settings,
            workingHours: user.workingHours
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update user settings
router.put('/settings', authMiddleware, async (req, res) => {
    try {
        const { settings, workingHours } = req.body;
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (settings) {
            user.settings = {
                ...user.settings,
                ...settings
            };
        }

        if (workingHours) {
            user.workingHours = {
                ...user.workingHours,
                ...workingHours
            };
        }

        await user.save();
        res.json({
            settings: user.settings,
            workingHours: user.workingHours
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.put('/working-hours', authMiddleware, async (req, res) => {
    try {
        // Changed from req.body.workingHours to req.body
        const { workingHours } = req.body;

        if (!workingHours) {
            return res.status(400).json({ error: 'Working hours data is required' });
        }

        // Updated timezone validation regex
        if (workingHours.timezone && !/^UTC[-+]\d{1,2}:\d{2}$/.test(workingHours.timezone)) {
            return res.status(400).json({ error: 'Invalid timezone format' });
        }

        // Updated time validation regex to allow single-digit hours
        const timeRegex = /^(1[0-2]|0?[1-9]):[0-5][0-9] (am|pm)$/i;

        // Rest of your existing validation...

        // Update user
        const user = await User.findById(req.user.userId);
        user.workingHours = {
            timezone: workingHours.timezone,
            days: workingHours.days
        };

        await user.save();

        res.json({
            message: 'Working hours updated successfully',
            workingHours: user.workingHours
        });
    } catch (err) {
        console.error('Error updating working hours:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { name } = req.body;
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (name) user.name = name;

        await user.save();
        res.json({
            name: user.name,
            email: user.email
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Change password
router.put('/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Both current and new passwords are required.' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
        }

        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        if (!user.password) {
            return res.status(400).json({ error: 'You registered via Google. Password change is not applicable.' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Current password is incorrect.' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedNewPassword;
        await user.save();

        res.status(200).json({ message: 'Password updated successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error.' });
    }
});

module.exports = router;