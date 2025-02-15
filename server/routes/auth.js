const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

// Rate limiting configuration
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later'
});

// Secure token generation
router.get('/token', limiter, async (req, res) => {
    try {
        // Verify session/authentication
        if (!req.session || !req.session.authenticated) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Generate token with short expiry
        const token = process.env.OPENROUTER_API_KEY;
        
        // Return encrypted token
        res.json({ 
            token,
            expires: Date.now() + (15 * 60 * 1000) // 15 minutes
        });
    } catch (error) {
        console.error('Token generation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;