const Appointment = require('../models/Appointment');
const Slot = require('../models/Slot');

// 1. Get Available Shifts/Slots with capacity check for a specific date
exports.getAvailableSlots = async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ success: false, message: 'Date required' });
        }

        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // Saare active shifts/slots fetch karo
        const slots = await Slot.find({ isActive: true });
        const availableSlots = [];

        for (let slot of slots) {
            // Check karo is slot mein kitni booking ho chuki hain aaj ke din
            const bookedCount = await Appointment.countDocuments({
                slotId: slot._id,
                scheduledDate: { $gte: startOfDay, $lte: endOfDay },
                status: { $ne: 'NO_SHOW' }
            });

            availableSlots.push({
                _id: slot._id,
                name: slot.name,
                timeRange: slot.timeRange,
                maxLimit: slot.maxLimit,
                bookedCount,
                isFull: bookedCount >= slot.maxLimit
            });
        }

        res.status(200).json({ success: true, data: availableSlots });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Book a New Appointment under a specific Slot
exports.bookAppointment = async (req, res) => {
    try {
        const { doctorId, treatmentType, scheduledDate, slotId } = req.body;
        const patientId = req.user.role === 'PATIENT' ? req.user._id : req.body.patientId; 

        if (!slotId || !scheduledDate) {
            return res.status(400).json({ success: false, message: 'Slot and Date are required' });
        }

        const startOfDay = new Date(scheduledDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(scheduledDate);
        endOfDay.setHours(23, 59, 59, 999);

        // NAYA LOGIC: Check karo ki user ne aaj is exact slot mein pehle se booking toh nahi ki hai
        const existingBooking = await Appointment.findOne({
            patientId: patientId,
            slotId: slotId,
            scheduledDate: { $gte: startOfDay, $lte: endOfDay }
        });

        if (existingBooking) {
            return res.status(400).json({ 
                success: false, 
                message: 'You have already booked an appointment for this specific shift slot today.' 
            });
        }

        // Check slot capacity limit
        const slot = await Slot.findById(slotId);
        if (!slot) {
            return res.status(404).json({ success: false, message: 'Slot not found' });
        }

        const bookedCount = await Appointment.countDocuments({
            slotId,
            scheduledDate: { $gte: startOfDay, $lte: endOfDay }
        });

        if (bookedCount >= slot.maxLimit) {
            return res.status(400).json({ success: false, message: 'This slot is full. Please select another slot.' });
        }

        // Is slot ke andar sequential token number generate karo
        const tokenNumber = bookedCount + 1;

        const newAppointment = new Appointment({
            patientId,
            doctorId,
            slotId,
            tokenNumber,
            treatmentType,
            scheduledDate,
            status: 'BOOKED'
        });

        await newAppointment.save();

        // Real-time socket broadcast
        req.io.emit('queue_updated', { message: 'New appointment booked', appointment: newAppointment });

        res.status(201).json({ success: true, data: newAppointment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Update Status (Arrived -> In Chair -> Completed) with Tracking
exports.updateAppointmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; 
        
        const appointment = await Appointment.findById(id);
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        appointment.status = status;
        const now = new Date();

        if (status === 'ARRIVED') {
            appointment.tracking.arrivalTime = now;
        } else if (status === 'IN_CHAIR') {
            appointment.tracking.chairEntryTime = now;
        } else if (status === 'COMPLETED') {
            appointment.tracking.chairExitTime = now;
        }

        await appointment.save();

        req.io.emit('status_changed', { appointmentId: id, newStatus: status, timestamp: now });

        res.status(200).json({ success: true, data: appointment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Get Today's Live Queue (Sorted by Slot and Token Number)
exports.getTodayQueue = async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const appointments = await Appointment.find({
            scheduledDate: { $gte: startOfDay, $lte: endOfDay }
        })
        .populate('patientId', 'fullName phone')
        .populate('slotId', 'name timeRange') // Frontend ko shift ka naam yahan se milega
        .sort({ tokenNumber: 1 }); // Token number ke hisab se queue arrange hogi

        res.status(200).json({ success: true, data: appointments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Upcoming Appointments for a Specific Patient
exports.getUpcomingAppointments = async (req, res) => {
    try {
        // Aaj raat 11:59 ke baad ki dates (Future)
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const upcoming = await Appointment.find({
            patientId: req.params.patientId,
            scheduledDate: { $gt: endOfDay },
            status: { $in: ['BOOKED'] } // Sirf booked wali dikhani hain
        })
        .populate('slotId', 'name timeRange')
        .populate('doctorId', 'fullName')
        .sort({ scheduledDate: 1 }); // Date ke hisab se ascending order

        res.status(200).json({ success: true, data: upcoming });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};