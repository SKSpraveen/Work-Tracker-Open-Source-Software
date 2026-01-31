require("dotenv").config();

// Initialize cron jobs BEFORE importing app
// This ensures cron jobs start immediately when server starts
require('./cronJobs');

const app = require("./src/app");
const connectDB = require("./src/config/db");

// Connect to database
connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Current date: ${new Date().toISOString().split('T')[0]}`);
  console.log(`Server time (Asia/Colombo): ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' })}`);
  console.log(`API Base URL: http://localhost:${PORT}/api`);
  console.log('='.repeat(50));
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});