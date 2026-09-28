const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('./db');
const { register, metricsMiddleware, activeBookingsGauge, bookingCreationsTotal } = require('./metrics');

function createApp(customDbPath = null) {
  const app = express();
  const db = new Database(customDbPath || undefined);

  app.use(cors());
  app.use(express.json());
  app.use(metricsMiddleware);

  // Serve static UI assets
  app.use(express.static(path.join(__dirname, '../public')));

  // Health check endpoint for DevOps pipelines & container monitoring
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'online-booking-system'
    });
  });

  // Prometheus Metrics endpoint
  app.get('/metrics', async (req, res) => {
    try {
      const stats = db.getStats();
      activeBookingsGauge.set(stats.activeBookings);
      
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (err) {
      res.status(500).end(err);
    }
  });

  // REST API Endpoints
  
  // Get all available resources
  app.get('/api/resources', (req, res) => {
    const resources = db.getResources();
    res.json({ success: true, data: resources });
  });

  // Get single resource by ID
  app.get('/api/resources/:id', (req, res) => {
    const resource = db.getResourceById(req.params.id);
    if (!resource) {
      return res.status(404).json({ success: false, error: 'Resource not found' });
    }
    res.json({ success: true, data: resource });
  });

  // Get all bookings (with optional resourceId or date filter)
  app.get('/api/bookings', (req, res) => {
    let bookings = db.getBookings();
    const { resourceId, date } = req.query;

    if (resourceId) {
      bookings = bookings.filter(b => b.resourceId === resourceId);
    }
    if (date) {
      bookings = bookings.filter(b => b.date === date);
    }

    res.json({ success: true, count: bookings.length, data: bookings });
  });

  // Create a new booking
  app.post('/api/bookings', (req, res) => {
    try {
      const newBooking = db.addBooking(req.body);
      bookingCreationsTotal.inc();
      activeBookingsGauge.set(db.getStats().activeBookings);
      
      res.status(201).json({
        success: true,
        message: 'Booking successfully confirmed!',
        data: newBooking
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        error: err.message
      });
    }
  });

  // Cancel an existing booking
  app.patch('/api/bookings/:id/cancel', (req, res) => {
    try {
      const cancelledBooking = db.cancelBooking(req.params.id);
      activeBookingsGauge.set(db.getStats().activeBookings);

      res.json({
        success: true,
        message: 'Booking successfully cancelled.',
        data: cancelledBooking
      });
    } catch (err) {
      res.status(404).json({
        success: false,
        error: err.message
      });
    }
  });

  // Get dashboard statistics
  app.get('/api/stats', (req, res) => {
    const stats = db.getStats();
    res.json({ success: true, data: stats });
  });

  return app;
}

module.exports = createApp;
