const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    patientId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    doctorId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    // NAYA: Shift/Slot reference jisse pata chalega ki patient kis session mein hai
    slotId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Slot',
        required: true
    },
    // NAYA: Us slot ke andar ka sequence token number (jaise Token #1, #2)
    tokenNumber: {
        type: Number,
        required: true
    },
    treatmentType: { 
        type: String, 
        enum: ['Routine Checkup', 'RCT', 'Surgery', 'Follow-up'], 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['BOOKED', 'ARRIVED', 'IN_CHAIR', 'COMPLETED', 'NO_SHOW', 'STANDBY'], 
        default: 'BOOKED' 
    },
    scheduledDate: { 
        type: Date, 
        required: true 
    },
    expectedTime: { 
        type: Date 
    }, 
    
    // Smart Tracking Metrics
    tracking: {
        arrivalTime: { type: Date },      
        chairEntryTime: { type: Date },   
        chairExitTime: { type: Date }     
    }
}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);