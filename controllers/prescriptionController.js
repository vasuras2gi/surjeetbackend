const Prescription = require('../models/Prescription');
const Appointment = require('../models/Appointment');

// @desc    Create a new prescription (Manual or Image)
// @route   POST /api/prescriptions
exports.createPrescription = async (req, res) => {
    try {
        // 1. Yahan se patientId hata diya, ab sirf appointmentId aayega
        const { appointmentId, doctorNotes, prescriptionType } = req.body; 
        
        // 2. Database se asli Appointment dhoondho
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        let medicines = [];
        let imageUrl = '';

        if (prescriptionType === 'MANUAL' && req.body.medicines) {
            medicines = JSON.parse(req.body.medicines); 
        }

        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`;
        }

        // 3. Naya Prescription Create Karo
        const newPrescription = await Prescription.create({
            appointmentId,
            patientId: appointment.patientId, // <--- SMART LOGIC: Yahan humne automatically asli ID nikal li
            doctorId: req.user._id, 
            prescriptionType,
            medicines,
            doctorNotes,
            imageUrl
        });

        // 4. Appointment ko COMPLETED mark karo aur exit time dalo
        appointment.status = 'COMPLETED';
        appointment.tracking.chairExitTime = new Date();
        await appointment.save();

        // 5. Live Queue ko update karo (Socket.io)
        req.io.emit('queue_updated', { message: 'Prescription generated' });
        req.io.emit('status_changed', { appointmentId, newStatus: 'COMPLETED' });

        res.status(201).json({ success: true, data: newPrescription });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get prescriptions for a specific patient
// @route   GET /api/prescriptions/patient/:patientId
exports.getPatientPrescriptions = async (req, res) => {
    try {
        const prescriptions = await Prescription.find({ patientId: req.params.patientId })
            .populate('doctorId', 'fullName')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: prescriptions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};



// const Prescription = require('../models/Prescription');
// const Appointment = require('../models/Appointment');

// // @desc    Create a new prescription (Manual or Image)
// // @route   POST /api/prescriptions
// exports.createPrescription = async (req, res) => {
//     try {
//         const { appointmentId, patientId, doctorNotes, prescriptionType } = req.body;
        
//         let medicines = [];
//         let imageUrl = '';

//         // Agar prescription MANUAL hai, toh frontend se medicines array stringify hoke aayega
//         if (prescriptionType === 'MANUAL' && req.body.medicines) {
//             medicines = JSON.parse(req.body.medicines); 
//         }

//         // Agar Multer ne file pakdi hai, toh iska matlab image upload hui hai
//         if (req.file) {
//             imageUrl = `/uploads/${req.file.filename}`;
//             // Future mein aap ise Cloudinary par upload karke uska secure_url yahan save kar sakte hain
//         }

//         const newPrescription = await Prescription.create({
//             appointmentId,
//             patientId,
//             doctorId: req.user._id, // protect middleware se automatically aayega
//             prescriptionType,
//             medicines,
//             doctorNotes,
//             imageUrl
//         });

//         // Smart Update: Parcha ban gaya matlab patient ka treatment khatam
//         // Hum automatically Appointment status 'COMPLETED' kar denge aur chairExitTime laga denge
//         await Appointment.findByIdAndUpdate(appointmentId, {
//             status: 'COMPLETED',
//             'tracking.chairExitTime': new Date()
//         });

//         res.status(201).json({ success: true, data: newPrescription });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// };

// // @desc    Get prescriptions for a specific patient
// // @route   GET /api/prescriptions/patient/:patientId
// exports.getPatientPrescriptions = async (req, res) => {
//     try {
//         const prescriptions = await Prescription.find({ patientId: req.params.patientId })
//             .populate('doctorId', 'fullName')
//             .sort({ createdAt: -1 });

//         res.status(200).json({ success: true, data: prescriptions });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// };