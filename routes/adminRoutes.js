const express = require('express');
const router = express.Router();
const { getAllUsers, updateUser, getDashboardStats, createWalkInAppointment } = require('../controllers/adminController')
const { protect, authorize } = require('../middleware/authMiddleware');

// Sabhi routes ko protect aur authorize kar diya ('RECEPTIONIST' = Admin)
router.use(protect);
router.use(authorize('RECEPTIONIST'));

router.get('/users', getAllUsers);
router.put('/users/:id', updateUser);
router.get('/stats', getDashboardStats);
router.post('/walk-in', createWalkInAppointment);

module.exports = router;