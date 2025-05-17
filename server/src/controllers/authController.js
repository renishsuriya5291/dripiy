const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');

exports.register = async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;

        // Validate input
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ message: 'All fields are required.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
        }
        if (!/\S+@\S+\.\S+/.test(email)) {
            return res.status(400).json({ message: 'Invalid email format.' });
        }
        
        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser)
            return res.status(400).json({ message: 'Email already registered.' });

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Save user
        const user = new User({
            email,
            password: hashedPassword,
            name: `${firstName} ${lastName}`,
        });
        await user.save();

        res.status(201).json({ message: 'Registration successful.' });
    } catch (err) {
        res.status(500).json({ message: 'Internal server error.' });
    }
};

// Secret for JWT (store in .env in production)
const JWT_SECRET = process.env.JWT_SECRET;

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user)
            return res.status(400).json({ message: 'Invalid email or password.' });

        // If user registered via Google, password may not be set
        if (!user.password)
            return res.status(400).json({ message: 'Please login with Google.' });

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch)
            return res.status(400).json({ message: 'Invalid email or password.' });

        // Generate JWT
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Respond with user info and token (omit password)
        res.status(200).json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Internal server error.' });
    }
};

exports.googleCallback = async (req, res) => {
    try {
        // Extract Google profile info from request (after OAuth flow)
        const { email, given_name, family_name } = req.user;
        let user = await User.findOne({ email });
        if (!user) {
            user = new User({
                email,
                name: `${given_name} ${family_name}`,
                // No password needed for Google accounts
            });
            await user.save();
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Respond with token and user info (omit password)
        res.status(200).json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Internal server error.' });
    }
};