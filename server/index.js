const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'couples-secret-key-2024';
const PORT = process.env.PORT || 3001;

// Email transport — only active when SMTP_USER + SMTP_PASS are set
const mailer = (process.env.SMTP_USER && process.env.SMTP_PASS)
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

async function sendCallEmail(toEmail, callerName, callType) {
  if (!mailer) return;
  try {
    await mailer.sendMail({
      from: `"Together 💕" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `${callerName} 正在呼叫你 ${callType === 'video' ? '📹' : '📞'}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2 style="color:#f43f5e">💕 Together</h2>
          <p><strong>${callerName}</strong> 正在向你發起${callType === 'video' ? '視訊' : '語音'}通話！</p>
          <p>請打開 App 接聽。</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
}

const app = express();
const server = http.createServer(app);

// Allow all origins in production (same-origin from Railway) and localhost in dev
const corsOptions = {
  origin: true,
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/couples', require('./routes/couples'));
app.use('/api/memories', require('./routes/memories'));
app.use('/api/stickers', require('./routes/stickers'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/dates', require('./routes/dates'));
app.use('/api/notes', require('./routes/notes'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Serve built React app in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Socket.io setup
const io = new Server(server, {
  cors: corsOptions
});

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
});

// Helper: get couple ID for user
function getCoupleId(userId) {
  const couple = db.prepare(
    'SELECT id FROM couples WHERE user1_id = ? OR user2_id = ?'
  ).get(userId, userId);
  return couple ? couple.id : null;
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.username} (${socket.id})`);

  // Join couple room
  socket.on('join-couple-room', (coupleId) => {
    socket.join(coupleId);
    console.log(`${socket.user.username} joined room: ${coupleId}`);
    socket.to(coupleId).emit('partner-status', { userId: socket.user.id, online: true });
  });

  // Send message
  socket.on('send-message', (data) => {
    try {
      const { content, sticker_id } = data;
      const userId = socket.user.id;
      const coupleId = getCoupleId(userId);

      if (!coupleId) {
        socket.emit('error', { message: 'No couple found' });
        return;
      }

      const id = uuidv4();
      db.prepare(
        'INSERT INTO messages (id, couple_id, sender_id, content, sticker_id) VALUES (?, ?, ?, ?, ?)'
      ).run(id, coupleId, userId, content || null, sticker_id || null);

      const message = db.prepare(`
        SELECT m.*, u.username, u.avatar
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.id = ?
      `).get(id);

      io.to(coupleId).emit('new-message', message);
    } catch (err) {
      console.error('Send message error:', err);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // WebRTC signaling - relay signals between couple
  socket.on('call-user', (data) => {
    const userId = socket.user.id;
    const coupleRow = db.prepare('SELECT * FROM couples WHERE user1_id = ? OR user2_id = ?').get(userId, userId);
    if (!coupleRow) return;
    socket.to(coupleRow.id).emit('incoming-call', {
      from: socket.user.username,
      fromId: userId,
      ...data
    });
    // Email the partner if they're not actively connected
    const partnerId = coupleRow.user1_id === userId ? coupleRow.user2_id : coupleRow.user1_id;
    if (partnerId) {
      const partner = db.prepare('SELECT email FROM users WHERE id = ?').get(partnerId);
      if (partner?.email) sendCallEmail(partner.email, socket.user.username, data.callType);
    }
  });

  socket.on('answer-call', (data) => {
    const coupleId = getCoupleId(socket.user.id);
    if (coupleId) {
      socket.to(coupleId).emit('call-answered', data);
    }
  });

  socket.on('end-call', () => {
    const coupleId = getCoupleId(socket.user.id);
    if (coupleId) {
      socket.to(coupleId).emit('call-ended');
    }
  });

  socket.on('webrtc-offer', (data) => {
    const coupleId = getCoupleId(socket.user.id);
    if (coupleId) {
      socket.to(coupleId).emit('webrtc-offer', data);
    }
  });

  socket.on('webrtc-answer', (data) => {
    const coupleId = getCoupleId(socket.user.id);
    if (coupleId) {
      socket.to(coupleId).emit('webrtc-answer', data);
    }
  });

  // Mark partner's messages as read and notify them
  socket.on('mark-read', () => {
    const userId = socket.user.id;
    const coupleId = getCoupleId(userId);
    if (!coupleId) return;
    const now = new Date().toISOString();
    db.prepare(
      'UPDATE messages SET read_at = ? WHERE couple_id = ? AND sender_id != ? AND read_at IS NULL'
    ).run(now, coupleId, userId);
    socket.to(coupleId).emit('messages-read', { read_at: now });
  });

  socket.on('webrtc-ice-candidate', (data) => {
    const coupleId = getCoupleId(socket.user.id);
    if (coupleId) {
      socket.to(coupleId).emit('webrtc-ice-candidate', data);
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.user.username}`);
    // Notify couple partner if in a call
    const coupleId = getCoupleId(socket.user.id);
    if (coupleId) {
      socket.to(coupleId).emit('call-ended');
      socket.to(coupleId).emit('partner-status', { userId: socket.user.id, online: false });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
