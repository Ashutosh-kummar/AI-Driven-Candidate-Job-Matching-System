// Quick test script to diagnose server issues
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

console.log('🔍 Running Diagnostics...\n');

// Test 1: Check .env file
console.log('1. Checking .env file...');
if (process.env.MONGODB_URI) {
  console.log('   ✅ MONGODB_URI found');
  // Hide password in output
  const uri = process.env.MONGODB_URI.replace(/:[^:@]+@/, ':****@');
  console.log('   📝 URI:', uri);
} else {
  console.log('   ❌ MONGODB_URI not found in .env');
}

if (process.env.CLAUDE_API_KEY) {
  console.log('   ✅ CLAUDE_API_KEY found');
  console.log('   📝 Key:', process.env.CLAUDE_API_KEY.substring(0, 10) + '...');
} else {
  console.log('   ❌ CLAUDE_API_KEY not found in .env');
}

// Test 2: Test MongoDB connection
console.log('\n2. Testing MongoDB connection...');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_resume_matching', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
})
.then(() => {
  console.log('   ✅ MongoDB Connected Successfully!');
  mongoose.connection.close();
  console.log('\n✅ All tests passed! Server should work fine.');
  process.exit(0);
})
.catch(err => {
  console.log('   ❌ MongoDB Connection Failed!');
  console.log('   Error:', err.message);
  console.log('\n💡 Solutions:');
  console.log('   1. Check MongoDB URI in .env file');
  console.log('   2. If using MongoDB Atlas, verify:');
  console.log('      - IP address is whitelisted (0.0.0.0/0 for all)');
  console.log('      - Username and password are correct');
  console.log('      - Database name is included in URI');
  console.log('   3. If using local MongoDB, ensure it\'s running');
  process.exit(1);
});

