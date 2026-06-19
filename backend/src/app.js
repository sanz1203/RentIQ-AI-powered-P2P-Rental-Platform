const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const db = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const listingRoutes = require('./routes/listingRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const aiRoutes = require('./routes/aiRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  req.cookies = {};
  if (req.headers.cookie) {
    const rawCookies = req.headers.cookie.split(';');
    rawCookies.forEach(cookie => {
      const parts = cookie.split('=');
      const name = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      req.cookies[name] = decodeURIComponent(value);
    });
  }
  next();
});

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use(express.static(path.join(__dirname, '../../frontend/src')));

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/chat', chatRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/src/index.html'));
});

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join_room', ({ booking_id, user_name }) => {
    const roomName = `booking_${booking_id}`;
    socket.join(roomName);
    console.log(`${user_name} joined chat room: ${roomName}`);
  });

  socket.on('send_message', async ({ booking_id, sender_id, sender_name, content }) => {
    const roomName = `booking_${booking_id}`;
    try {
      
      const result = await db.query(
        'INSERT INTO messages (booking_id, sender_id, content) VALUES ($1, $2, $3) RETURNING id, created_at',
        [booking_id, sender_id, content]
      );
      
      const savedMsg = result.rows[0];

      io.to(roomName).emit('receive_message', {
        id: savedMsg.id,
        booking_id,
        sender_id,
        sender_name,
        content,
        created_at: savedMsg.created_at
      });
    } catch (err) {
      console.error('Socket message save error:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
db.initDb().then(() => {
  server.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`   RentIQ Server running on: http://localhost:${PORT}`);
    console.log(`==================================================`);
  });
});
