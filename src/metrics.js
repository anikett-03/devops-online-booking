const client = require('prom-client');

// Create a Registry which registers the metrics
const register = new client.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'online-booking-system',
  environment: process.env.NODE_ENV || 'production'
});

// Enable default metrics (CPU, Memory, Event Loop Lag, etc.)
client.collectDefaultMetrics({ register });

// Custom Prometheus Metrics
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5]
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests processed',
  labelNames: ['method', 'route', 'code']
});

const activeBookingsGauge = new client.Gauge({
  name: 'active_bookings_total',
  help: 'Total count of active confirmed bookings'
});

const bookingCreationsTotal = new client.Counter({
  name: 'booking_creations_total',
  help: 'Total count of successful bookings created'
});

register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestsTotal);
register.registerMetric(activeBookingsGauge);
register.registerMetric(bookingCreationsTotal);

// Middleware to track request metrics
const metricsMiddleware = (req, res, next) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on('finish', () => {
    const route = req.route ? req.route.path : req.path;
    const labels = { method: req.method, route, code: res.statusCode };
    end(labels);
    httpRequestsTotal.inc(labels);
  });
  next();
};

module.exports = {
  register,
  metricsMiddleware,
  activeBookingsGauge,
  bookingCreationsTotal
};
