const createApp = require('./app');

const PORT = process.env.PORT || 3000;
const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Online Booking System Server active on port ${PORT}`);
  console.log(`📊 Health Endpoint:   http://localhost:${PORT}/health`);
  console.log(`📈 Metrics Endpoint:  http://localhost:${PORT}/metrics`);
  console.log(`🖥️  Web UI Dashboard:  http://localhost:${PORT}`);
  console.log(`====================================================`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down server gracefully...');
  server.close(() => {
    console.log('Server process terminated successfully.');
  });
});
