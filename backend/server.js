const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/resumes', require('./routes/resumes'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/recruiter', require('./routes/recruiter'));

// MongoDB Connection with Auto-Reconnect
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_resume_matching';

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 5, // Maintain at least 5 socket connections
      maxIdleTimeMS: 30000, // Close connections after 30s of inactivity
      heartbeatFrequencyMS: 10000, // Check connection every 10s
    });
    
    console.log('✅ MongoDB Connected');
    console.log(`Connected to: ${MONGODB_URI.includes('mongodb.net') ? 'MongoDB Atlas' : 'Local MongoDB'}`);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    if (MONGODB_URI.includes('mongodb.net')) {
      console.error('\n⚠️  MongoDB Atlas Connection Failed!');
      console.error('Possible solutions:');
      console.error('1. Whitelist your IP address in MongoDB Atlas:');
      console.error('   - Go to: https://cloud.mongodb.com/');
      console.error('   - Navigate to: Network Access → Add IP Address');
      console.error('   - Add your current IP or use 0.0.0.0/0 (less secure, for development only)');
      console.error('\n2. OR use local MongoDB by setting MONGODB_URI in .env to:');
      console.error('   MONGODB_URI=mongodb://localhost:27017/ai_resume_matching');
      console.error('\n3. Make sure MongoDB is running locally if using option 2');
    } else {
      console.error('\n⚠️  Local MongoDB Connection Failed!');
      console.error('Make sure MongoDB is installed and running on your machine.');
      console.error('Install: https://www.mongodb.com/try/download/community');
      console.error('\nRetrying connection in 5 seconds...');
      // Retry connection after 5 seconds
      setTimeout(connectDB, 5000);
    }
  }
};

// Connection event handlers for auto-reconnect
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  Mongoose disconnected. Attempting to reconnect...');
  // Auto-reconnect after 2 seconds
  setTimeout(() => {
    connectDB().catch(err => {
      console.error('Reconnection attempt failed:', err.message);
    });
  }, 2000);
});

// Handle application termination
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed through app termination');
  process.exit(0);
});

// Initial connection
connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


