const express = require('express');
const router = express.Router();
const { createPrescription, getPatientPrescriptions } = require('../controllers/prescriptionController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Route to create prescription
// "upload.single('image')" middleware req.file mein image data daal dega
router.post(
    '/', 
    protect, 
    authorize('DOCTOR'), 
    upload.single('image'), 
    createPrescription
);

// Route to fetch patient's history
// Doctor aur Patient dono apni/apne patient ki history dekh sakte hain
router.get(
    '/patient/:patientId', 
    protect, 
    authorize('PATIENT', 'DOCTOR', 'RECEPTIONIST'), 
    getPatientPrescriptions
);

module.exports = router;