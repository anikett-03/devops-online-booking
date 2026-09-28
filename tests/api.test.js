const request = require('supertest');
const fs = require('fs');
const path = require('path');
const createApp = require('../src/app');

const TEST_DB_PATH = path.join(__dirname, 'test_db.json');

describe('Online Booking System DevOps Integration Tests', () => {
  let app;

  beforeEach(() => {
    // Ensure clean state before each test
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    app = createApp(TEST_DB_PATH);
  });

  afterAll(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe('GET /health', () => {
    it('should return HTTP 200 and status UP', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('status', 'UP');
      expect(res.body).toHaveProperty('service', 'online-booking-system');
    });
  });

  describe('GET /metrics', () => {
    it('should expose Prometheus metrics format', async () => {
      const res = await request(app).get('/metrics');
      expect(res.statusCode).toEqual(200);
      expect(res.text).toContain('http_requests_total');
      expect(res.text).toContain('active_bookings_total');
    });
  });

  describe('GET /api/resources', () => {
    it('should list all initial resources', async () => {
      const res = await request(app).get('/api/resources');
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should fetch single resource details', async () => {
      const res = await request(app).get('/api/resources/res-1');
      expect(res.statusCode).toEqual(200);
      expect(res.body.data.name).toBe('Innovation Lab A');
    });

    it('should return 404 for invalid resource ID', async () => {
      const res = await request(app).get('/api/resources/invalid-id');
      expect(res.statusCode).toEqual(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/bookings', () => {
    it('should create a new valid booking successfully', async () => {
      const newBooking = {
        resourceId: 'res-3',
        customerName: 'Charlie Brown',
        customerEmail: 'charlie@example.com',
        date: '2026-10-10',
        startTime: '09:00',
        endTime: '11:00',
        purpose: 'Research Work'
      };

      const res = await request(app)
        .post('/api/bookings')
        .send(newBooking);

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.status).toBe('Confirmed');
    });

    it('should reject booking if required fields are missing', async () => {
      const incompleteBooking = {
        customerName: 'Incomplete Request'
      };

      const res = await request(app)
        .post('/api/bookings')
        .send(incompleteBooking);

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Missing required booking fields');
    });

    it('should reject booking when start time is equal or after end time', async () => {
      const invalidTimeBooking = {
        resourceId: 'res-1',
        customerName: 'Test User',
        customerEmail: 'test@example.com',
        date: '2026-10-15',
        startTime: '14:00',
        endTime: '13:00',
        purpose: 'Invalid Time Range'
      };

      const res = await request(app)
        .post('/api/bookings')
        .send(invalidTimeBooking);

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toContain('Start time must be strictly before end time');
    });

    it('should prevent double booking for overlapping time slots', async () => {
      const bookingData = {
        resourceId: 'res-1',
        customerName: 'User One',
        customerEmail: 'user1@example.com',
        date: '2026-11-01',
        startTime: '10:00',
        endTime: '12:00',
        purpose: 'Meeting 1'
      };

      // Create first booking
      const res1 = await request(app).post('/api/bookings').send(bookingData);
      expect(res1.statusCode).toEqual(201);

      // Attempt overlapping booking
      const overlappingBooking = {
        resourceId: 'res-1',
        customerName: 'User Two',
        customerEmail: 'user2@example.com',
        date: '2026-11-01',
        startTime: '11:00',
        endTime: '13:00',
        purpose: 'Meeting 2 Overlap'
      };

      const res2 = await request(app).post('/api/bookings').send(overlappingBooking);
      expect(res2.statusCode).toEqual(400);
      expect(res2.body.error).toContain('Time slot conflict');
    });
  });

  describe('PATCH /api/bookings/:id/cancel', () => {
    it('should cancel an existing booking', async () => {
      const res = await request(app).patch('/api/bookings/bk-101/cancel');
      expect(res.statusCode).toEqual(200);
      expect(res.body.data.status).toBe('Cancelled');
    });

    it('should return 404 when cancelling non-existent booking', async () => {
      const res = await request(app).patch('/api/bookings/nonexistent-id/cancel');
      expect(res.statusCode).toEqual(404);
    });
  });

  describe('GET /api/stats', () => {
    it('should return correct booking metrics statistics', async () => {
      const res = await request(app).get('/api/stats');
      expect(res.statusCode).toEqual(200);
      expect(res.body.data).toHaveProperty('totalResources');
      expect(res.body.data).toHaveProperty('totalBookings');
      expect(res.body.data).toHaveProperty('activeBookings');
    });
  });
});
