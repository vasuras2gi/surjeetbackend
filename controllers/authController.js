const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const crypto = require('crypto');

// @desc    Register a new user
// @route   POST /api/auth/register
exports.register = async (req, res) => {
    try {
        const { fullName, phone, email, password, role } = req.body;

        const userExists = await User.findOne({ $or: [{ email }, { phone }] });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const user = await User.create({ fullName, phone, email, password, role });

        res.status(201).json({
            success: true,
            user: { _id: user._id, fullName: user.fullName, role: user.role },
            token: generateToken(user._id)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Auth user & get token (Login)
// @route   POST /api/auth/login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body; // Phone number se login bhi add kar sakte hain email ki jagah

        const user = await User.findOne({ email }).select('+password');
        
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        res.status(200).json({
            success: true,
            user: { _id: user._id, fullName: user.fullName, role: user.role },
            token: generateToken(user._id)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Forgot Password (Generates Token)
// @route   POST /api/auth/forgotpassword
exports.forgotPassword = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const resetToken = user.getResetPasswordToken();
        await user.save({ validateBeforeSave: false });

        // Ideal scenario: Yahan Nodemailer se email bhejte hain.
        // Abhi ke liye response mein token bhej rahe hain testing ke liye.
        // Frontend par user ko ek link milega: http://localhost:3000/reset-password/${resetToken}
        
        const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

        res.status(200).json({
            success: true,
            message: 'Reset token generated (In production, send this via Email)',
            resetUrl,
            resetToken // Sirf dev testing ke liye
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Reset Password
// @route   PUT /api/auth/resetpassword/:resettoken
exports.resetPassword = async (req, res) => {
    try {
        const resetPasswordToken = crypto.createHash('sha256').update(req.params.resettoken).digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired token' });
        }

        // Set new password
        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password updated successfully',
            token: generateToken(user._id)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};