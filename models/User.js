const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto'); // Built-in Node.js module for secure tokens

const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true }, // Forgot password aur notifications ke liye
    password: { type: String, required: true, select: false }, // select: false matlab normal queries mein password nahi aayega
    role: { type: String, enum: ['PATIENT', 'DOCTOR', 'RECEPTIONIST'], default: 'PATIENT' },
    whatsappAlerts: { type: Boolean, default: true },
    medicalHistory: [{ type: String }],
    
    // Forgot Password Fields
    resetPasswordToken: String,
    resetPasswordExpire: Date
}, { timestamps: true });

// Pre-save hook to hash password before saving to database
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Method to generate and hash password reset token
userSchema.methods.getResetPasswordToken = function () {
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    // Hash token and set to resetPasswordToken field
    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Set expire time (10 minutes)
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    
    return resetToken;
};

module.exports = mongoose.model('User', userSchema);