const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
    name: { type: String, required: true }, // e.g., "Morning Shift"
    timeRange: { type: String, required: true }, // e.g., "11:00 AM - 02:00 PM"
    maxLimit: { type: Number, required: true, default: 20 },
    isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('Slot', slotSchema);