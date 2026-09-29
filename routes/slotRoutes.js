const express = require('express');
const router = express.Router();
const { createSlot, getSlots } = require('../controllers/slotController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Admin/Receptionist slots create kar sakte hain
router.post('/', protect, authorize('ADMIN', 'RECEPTIONIST'), createSlot);

// Sabhi logged-in users slots dekh sakte hain
router.get('/', protect, getSlots);

module.exports = router;