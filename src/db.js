const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

const INITIAL_RESOURCES = [
  { id: 'res-1', name: 'Innovation Lab A', type: 'Conference Room', capacity: 12, location: 'Building 1, Floor 3', pricePerHour: 45, status: 'Available' },
  { id: 'res-2', name: 'Executive Suite 402', type: 'Meeting Room', capacity: 6, location: 'Building 1, Floor 4', pricePerHour: 30, status: 'Available' },
  { id: 'res-3', name: 'Focus Pod 101', type: 'Workstation', capacity: 1, location: 'Building 2, Floor 1', pricePerHour: 10, status: 'Available' },
  { id: 'res-4', name: 'Auditorium Main', type: 'Event Space', capacity: 150, location: 'Main Building, Floor 1', pricePerHour: 200, status: 'Available' },
  { id: 'res-5', name: 'Collaborate Lounge B', type: 'Open Space', capacity: 20, location: 'Building 2, Floor 2', pricePerHour: 60, status: 'Available' }
];

const INITIAL_BOOKINGS = [
  {
    id: 'bk-101',
    resourceId: 'res-1',
    customerName: 'Alice Smith',
    customerEmail: 'alice@example.com',
    date: '2026-09-30',
    startTime: '10:00',
    endTime: '12:00',
    purpose: 'Team Sprint Planning',
    status: 'Confirmed',
    createdAt: new Date('2026-09-25T09:00:00Z').toISOString()
  },
  {
    id: 'bk-102',
    resourceId: 'res-2',
    customerName: 'Bob Jones',
    customerEmail: 'bob@example.com',
    date: '2026-10-01',
    startTime: '14:00',
    endTime: '15:30',
    purpose: 'Client Demo',
    status: 'Confirmed',
    createdAt: new Date('2026-09-26T11:30:00Z').toISOString()
  }
];

class Database {
  constructor(filePath = DATA_FILE) {
    this.filePath = filePath;
    this.data = { resources: [], bookings: [] };
    this.init();
  }

  init() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(raw);
      } catch (err) {
        console.warn('Error reading db.json, reinitializing standard dataset:', err.message);
        this.resetDefaults();
      }
    } else {
      this.resetDefaults();
    }
  }

  resetDefaults() {
    this.data = {
      resources: [...INITIAL_RESOURCES],
      bookings: [...INITIAL_BOOKINGS]
    };
    this.save();
  }

  save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save data to file:', err.message);
    }
  }

  getResources() {
    return this.data.resources;
  }

  getResourceById(id) {
    return this.data.resources.find(r => r.id === id);
  }

  getBookings() {
    return this.data.bookings;
  }

  getBookingById(id) {
    return this.data.bookings.find(b => b.id === id);
  }

  hasConflict(resourceId, date, startTime, endTime, excludeBookingId = null) {
    return this.data.bookings.some(b => {
      if (b.status === 'Cancelled') return false;
      if (excludeBookingId && b.id === excludeBookingId) return false;
      if (b.resourceId !== resourceId || b.date !== date) return false;

      // Check time overlap: (StartA < EndB) && (EndA > StartB)
      return (startTime < b.endTime) && (endTime > b.startTime);
    });
  }

  addBooking(bookingData) {
    const { resourceId, customerName, customerEmail, date, startTime, endTime, purpose } = bookingData;
    
    if (!resourceId || !customerName || !customerEmail || !date || !startTime || !endTime) {
      throw new Error('Missing required booking fields.');
    }

    const resource = this.getResourceById(resourceId);
    if (!resource) {
      throw new Error('Resource not found.');
    }

    if (startTime >= endTime) {
      throw new Error('Start time must be strictly before end time.');
    }

    if (this.hasConflict(resourceId, date, startTime, endTime)) {
      throw new Error('Time slot conflict: Resource is already booked for this duration.');
    }

    const newBooking = {
      id: `bk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      resourceId,
      customerName,
      customerEmail,
      date,
      startTime,
      endTime,
      purpose: purpose || 'General Use',
      status: 'Confirmed',
      createdAt: new Date().toISOString()
    };

    this.data.bookings.push(newBooking);
    this.save();
    return newBooking;
  }

  cancelBooking(id) {
    const booking = this.getBookingById(id);
    if (!booking) {
      throw new Error('Booking not found.');
    }
    booking.status = 'Cancelled';
    this.save();
    return booking;
  }

  getStats() {
    const totalBookings = this.data.bookings.length;
    const activeBookings = this.data.bookings.filter(b => b.status === 'Confirmed').length;
    const cancelledBookings = this.data.bookings.filter(b => b.status === 'Cancelled').length;
    const totalResources = this.data.resources.length;

    return {
      totalResources,
      totalBookings,
      activeBookings,
      cancelledBookings
    };
  }
}

module.exports = Database;
