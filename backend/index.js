const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const authroutes = require('./routes/authRoutes');
const connectDb = require("./config/dbConnect");
const chatRoute = require("./routes/chatRoutes");
const initializeSocket = require("./services/socketService");
const statusRoute = require("./routes/statusRoutes");

dotenv.config();//environment variable ko load krne k liye

const port = process.env.PORT || 3000; // FIXED: PORT not port
const app = express();//made an instance of my express app

// CORS configuration->for cross origin operation if frontend backend runs in diffrent port 
//cors basically croos origon kincondition main browser frontend ko permisiion deti hain ki go and access my backend
const corsOption = {
    // Allow the frontend dev server. Update REACT_APP_FRONTEND_URL in production.
    origin: process.env.FRONTEND_URL || "http://localhost:3001",
    credentials: true,

    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"]
};

// Apply CORS once
app.use(cors(corsOption));

// Simple request logger for debugging dev environment
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} from ${req.ip}`);
    next();
});

// Body parser middleware - CRITICAL ORDER
app.use(express.json({ limit: '50mb' })); // ✅ Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // ✅ Parse URL-encoded bodies jab hum html form submit krte hain 
app.use(cookieParser());

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);

console.log(">>> initializeSocket returned:", io);
console.log(">>> io && io.socketUserMap:", !!io, io ? io.socketUserMap : undefined);

// Attach Socket.IO to requests
app.use((req, res, next) => {
    console.log(">>>req:",!!req,req?req:undefined);
    req.io = io;
    req.socketUserMap = io.socketUserMap;
    next();
});

// Connect to database asynchronously
connectDb();

// Routes
app.use('/api/auth', authroutes);
app.use('/api/chat', chatRoute);
app.use('/api/status/auth', statusRoute); // FIXED: Changed from '/api/status/auth' to '/api/status'

// Error handling middleware
app.use(async (err, req, res, next) => {
    console.error("Global error:", err);
    if(err){
    await res.status(500).json({
        status: "fail",
        message: "Internal server error",
        data: err.message
        
    }) };
});

// Start server
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

module.exports = { app, server, io };
