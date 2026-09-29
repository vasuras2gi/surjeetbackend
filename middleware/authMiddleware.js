const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 1. Protect Routes (Check if user is logged in)
exports.protect = async (req, res, next) => {
    let token;

    // Check header for authorization token
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized to access this route. Please login.' });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch user from DB and attach to request object
        req.user = await User.findById(decoded.id);

        if (!req.user) {
            return res.status(401).json({ success: false, message: 'User no longer exists.' });
        }

        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Token is invalid or expired.' });
    }
};

// 2. Grant access to specific roles (e.g., 'DOCTOR', 'RECEPTIONIST')
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: `User role '${req.user.role}' is not authorized to perform this action.` 
            });
        }
        next();
    };
};