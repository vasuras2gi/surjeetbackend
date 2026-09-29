const express = require('express');
const router = express.Router();
const { 
    bookAppointment, 
    updateAppointmentStatus, 
    getTodayQueue, 
    getAvailableSlots 
} = require('../controllers/appointmentController');
const { getUpcomingAppointments } = require('../controllers/appointmentController');

// Middleware import karein
const { protect, authorize } = require('../middleware/authMiddleware');

// 1. Book a new appointment under a slot
router.post('/book', protect, bookAppointment);

// 2. Update appointment status (Doctor / Receptionist)
router.put('/status/:id', protect, authorize('DOCTOR', 'RECEPTIONIST'), updateAppointmentStatus);

// 3. Get today's queue (Patient, Doctor, Receptionist)
router.get('/today', protect, authorize('DOCTOR', 'RECEPTIONIST', 'PATIENT'), getTodayQueue);

// 4. Get available shifts/slots for booking page
router.get('/slots/available', protect, getAvailableSlots);

router.get('/patient/:patientId/upcoming', protect, getUpcomingAppointments);

module.exports = router;