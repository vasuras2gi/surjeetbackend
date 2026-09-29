const User = require('../models/User');
const Appointment = require('../models/Appointment');

// @desc    Get all users (Filter by role optional, e.g., ?role=PATIENT)
// @route   GET /api/admin/users
exports.getAllUsers = async (req, res) => {
    try {
        const query = req.query.role ? { role: req.query.role } : {};
        const users = await User.find(query).select('-password').sort({ createdAt: -1 });
        
        res.status(200).json({ success: true, count: users.length, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update user details (e.g., Phone number update by Admin)
// @route   PUT /api/admin/users/:id
exports.updateUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        }).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get Clinic Dashboard Stats for Today
// @route   GET /api/admin/stats
exports.getDashboardStats = async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // Aaj ke total appointments
        const todayAppointments = await Appointment.find({
            scheduledDate: { $gte: startOfDay, $lte: endOfDay }
        });

        const stats = {
            totalToday: todayAppointments.length,
            completed: todayAppointments.filter(app => app.status === 'COMPLETED').length,
            waiting: todayAppointments.filter(app => ['ARRIVED', 'BOOKED'].includes(app.status)).length,
            inChair: todayAppointments.filter(app => app.status === 'IN_CHAIR').length,
            totalPatients: await User.countDocuments({ role: 'PATIENT' }) // Database mein total patients
        };

        res.status(200).json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// @desc    Quick Walk-in Booking (Creates user if not exists & adds to queue)
// @route   POST /api/admin/walk-in
// @desc    Quick Walk-in Booking with Dynamic Queue Shifting
// @route   POST /api/admin/walk-in
exports.createWalkInAppointment = async (req, res) => {
    try {
        const { fullName, phone, treatmentType, insertPosition } = req.body;
        let patient = await User.findOne({ phone });

        // Naya user banayein agar exist nahi karta
        if (!patient) {
            patient = await User.create({
                fullName, phone,
                email: `${phone}@surjeetclinic.com`,
                password: phone, role: 'PATIENT'
            });
        }

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // Aaj ki queue fetch karein
        const todayAppointments = await Appointment.find({
            scheduledDate: { $gte: startOfDay,$lte: endOfDay }
        }).sort({ expectedTime: 1 });

        let assignedTime = new Date();
        let shiftRequired = false;
        let shiftStartIndex = -1;

        // Agar admin ne specific Token Number (insertPosition) diya hai
        if (insertPosition && insertPosition > 0) {
            const targetIndex = insertPosition - 1; // Array 0-indexed hota hai
            
            if (targetIndex < todayAppointments.length) {
                // Target spot wale patient ka time naye walk-in ko de do
                assignedTime = new Date(todayAppointments[targetIndex].expectedTime);
                shiftRequired = true;
                shiftStartIndex = targetIndex;
            } else if (todayAppointments.length > 0) {
                // Agar queue choti hai aur bada number diya hai, toh sabse aakhri me lagao
                const lastApp = todayAppointments[todayAppointments.length - 1];
                assignedTime = new Date(lastApp.expectedTime);
                assignedTime.setMinutes(assignedTime.getMinutes() + 15);
            }
        }

        // Naya Walk-in add karo
        const newAppointment = await Appointment.create({
            patientId: patient._id,
            doctorId: process.env.MAIN_DOCTOR_ID || req.user._id, 
            treatmentType: treatmentType || 'Routine Checkup',
            scheduledDate: new Date(),
            expectedTime: assignedTime,
            status: 'ARRIVED', // Walk-in hamesha directly arrived hota hai
            tracking: { arrivalTime: new Date() }
        });

        // Queue Shifting Logic
        if (shiftRequired) {
            const durations = { 'Routine Checkup': 15, 'RCT': 45, 'Surgery': 60 };
            const shiftMins = durations[treatmentType] || 15;

            // Target index se leke aakhri patient tak sabka time aage badha do
            for (let i = shiftStartIndex; i < todayAppointments.length; i++) {
                const appToShift = todayAppointments[i];
                const shiftedTime = new Date(appToShift.expectedTime);
                shiftedTime.setMinutes(shiftedTime.getMinutes() + shiftMins);
                appToShift.expectedTime = shiftedTime;
                await appToShift.save();
            }
        }

        // Sabhi dashboards (Patient, Doctor, Admin) ko naya data bhejo
        req.io.emit('queue_updated', { message: 'Walk-in added and queue shifted' });
        res.status(201).json({ success: true, data: newAppointment });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};