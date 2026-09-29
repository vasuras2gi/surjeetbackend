const Slot = require('../models/Slot');

// 1. Create a new Slot (Admin/Receptionist)
exports.createSlot = async (req, res) => {
    try {
        const { name, timeRange, maxLimit } = req.body;
        
        const newSlot = await Slot.create({
            name,
            timeRange,
            maxLimit
        });

        res.status(201).json({ success: true, data: newSlot });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Get all Slots
exports.getSlots = async (req, res) => {
    try {
        const slots = await Slot.find({});
        res.status(200).json({ success: true, data: slots });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};