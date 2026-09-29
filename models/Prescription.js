const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
    appointmentId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Appointment', 
        required: true 
    },
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
    
    // Type flag to identify prescription format
    prescriptionType: { 
        type: String, 
        enum: ['MANUAL', 'IMAGE'], 
        default: 'MANUAL' 
    },

    // 1. Manual Option Fields
    medicines: [{
        name: { type: String },
        dosage: { type: String }, 
        days: { Number },
        instructions: { type: String }
    }],
    doctorNotes: { type: String },

    // 2. Image Upload Option Field
    imageUrl: { type: String } // Backend par save hui image ka path ya Cloudinary URL
    
}, { timestamps: true });

module.exports = mongoose.model('Prescription', prescriptionSchema);