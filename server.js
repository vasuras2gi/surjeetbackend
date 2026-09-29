const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const path = require('path');

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'], // Added Vite port
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 1. Initialize Socket.io FIRST
const io = new Server(server, {
    cors: {
        origin: ['http://localhost:3000', 'http://localhost:5173'],
        methods: ['GET', 'POST']
    }
});

// GLOBAL STATE: Doctor ka current status server memory mein save rakhne ke liye
let currentDoctorStatus = 'AVAILABLE';

io.on("connection", (socket) => {
    console.log(`User Connected: ${socket.id}`);

    // NAYA: Koi bhi naya user (Patient/Admin) connect ho, toh turant current status bhej do
    socket.emit('doctor_status_updated', { status: currentDoctorStatus });

    // NAYA: Jab doctor dashboard se 'Mark Leave/Busy' toggle karega
    socket.on('doctor_status_change', (data) => {
        currentDoctorStatus = data.status; // Server memory update karo
        io.emit('doctor_status_updated', { status: currentDoctorStatus }); // Sabhi connected logo ko update bhej do
    });

    // Jab receptionist queue update kare
    socket.on("update_queue", (data) => {
        io.emit("queue_updated", data);
    });

    socket.on("disconnect", () => {
        console.log(`User Disconnected: ${socket.id}`);
    });
});

// 2. Attach Socket.io to req object AFTER it is initialized
app.use((req, res, next) => {
    req.io = io;
    next();
});

// 3. Load Routes AFTER the middleware
app.use('/api/appointments', require('./routes/appointmentRoutes'));
app.use('/api/auth', require('./routes/authRoutes')); 
app.use('/api/prescriptions', require('./routes/prescriptionRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/slots', require('./routes/slotRoutes'));

app.get("/", (req, res) => {
    res.send(`Surjeet Dental Clinic API is running`);
});

// MongoDB Connection & Server Start
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB Connected Successfully');
        server.listen(PORT, () => {
            console.log(`🚀 Server is running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('❌ MongoDB Connection Error:', error.message);
    });