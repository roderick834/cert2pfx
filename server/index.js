const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const webpush = require('web-push');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'couples-secret-key-2024';
const PORT = process.env.PORT || 3001;

// VAPID setup for web push
const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  || 'BGYDOxblN6Y1gGbS4Nz2HZQtNpAfhZDBaSmIrKNHU-sGbHq9iUkJdZFdDBKRCvCaUWTPxt35RedsDc9hOQOyjqY';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '5YvMvLMs-zvKrQD_VjOfNACIkX8zZI_bh-Rr1hpMf6Q';
webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:hafu9911@gmail.com', VAPID_PUBLIC, VAPID_PRIVATE);

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

// ── Security middleware ─────────────────────────────────────────
// Helmet: sets safe HTTP headers (XSS, clickjacking, MIME sniff, HSTS…)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow /uploads images
  contentSecurityPolicy: false, // CSP handled by client app
}));

app.use(cors(corsOptions));

// Reduce body size limits — 50MB was excessive; file uploads use multer
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max: 20,                     // max 20 auth attempts per IP per 15 min
  message: { error: '嘗試次數過多，請 15 分鐘後再試' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 min
  max: 120,             // 120 req/min per IP (generous for active chat use)
  message: { error: '請求過於頻繁，請稍後再試' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for password reset (prevent email enumeration)
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: '重設密碼次數過多，請 1 小時後再試' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes — auth endpoints get stricter rate limits
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', resetLimiter);
app.use('/api/auth/reset-password', resetLimiter);
app.use('/api', apiLimiter);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/couples', require('./routes/couples'));
app.use('/api/memories', require('./routes/memories'));
app.use('/api/stickers', require('./routes/stickers'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/dates', require('./routes/dates'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/push', require('./routes/push'));
app.use('/api/albums', require('./routes/albums'));

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

// Helper: send ntfy.sh notification
// In-memory store for pending calls (cleared on answer/end, re-sent on reconnect)
const pendingCalls = new Map(); // coupleId → { offer, callType, from, fromId, ts }

async function sendNtfy(userId, title, body, tags = '') {
  const row = db.prepare('SELECT ntfy_topic FROM users WHERE id = ?').get(userId);
  if (!row?.ntfy_topic) return;
  fetch(`https://ntfy.sh/${encodeURIComponent(row.ntfy_topic)}`, {
    method: 'POST',
    headers: {
      'Title': title,
      'Tags': tags,
      'Content-Type': 'text/plain; charset=utf-8',
    },
    body,
  }).catch(() => {});
}

// Helper: send web push to a user (skips if they have an active socket connection)
function isUserOnline(userId) {
  return [...io.sockets.sockets.values()].some(s => s.user?.id === userId);
}

function _sendPushRaw(userId, payload) {
  const subs = db.prepare('SELECT subscription FROM push_subscriptions WHERE user_id = ?').all(userId);
  const body = JSON.stringify(payload);
  subs.forEach(({ subscription }) => {
    webpush.sendNotification(JSON.parse(subscription), body).catch(err => {
      if (err.statusCode === 410 || err.statusCode === 404) {
        db.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND subscription = ?')
          .run(userId, subscription);
      }
    });
  });
}

function sendPush(userId, payload) {
  // Don't push if user is actively connected — they get real-time updates
  if (isUserOnline(userId)) return;
  _sendPushRaw(userId, payload);
}

// For calls: always push even if online (app may be backgrounded)
function sendCallPush(userId, payload) {
  _sendPushRaw(userId, payload);
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.username} (${socket.id})`);

  // Join couple room
  socket.on('join-couple-room', (coupleId) => {
    socket.join(coupleId);
    console.log(`${socket.user.username} joined room: ${coupleId}`);
    socket.to(coupleId).emit('partner-status', { userId: socket.user.id, online: true });
    // Re-emit pending call if callee missed the original event (e.g. app was backgrounded)
    const pending = pendingCalls.get(String(coupleId));
    if (pending && pending.fromId !== socket.user.id && Date.now() - pending.ts < 90000) {
      socket.emit('incoming-call', { from: pending.from, fromId: pending.fromId, offer: pending.offer, callType: pending.callType });
    }
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

      // Push notification to partner if they're offline
      const coupleRow2 = db.prepare('SELECT * FROM couples WHERE id = ?').get(coupleId);
      if (coupleRow2) {
        const partnerId2 = coupleRow2.user1_id === userId ? coupleRow2.user2_id : coupleRow2.user1_id;
        if (partnerId2) {
          const preview = content ? (content.length > 60 ? content.slice(0, 60) + '…' : content) : '傳送了一張貼圖';
          sendPush(partnerId2, { title: `💬 ${socket.user.username}`, body: preview, tag: 'message', url: '/chat' });
          sendNtfy(partnerId2, `💬 ${socket.user.username}`, preview, 'speech_balloon');
        }
      }
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
    const coupleKey = String(coupleRow.id);
    // Store pending call so callee can receive it if they reconnect within 90s
    pendingCalls.set(coupleKey, { offer: data.offer, callType: data.callType, from: socket.user.username, fromId: userId, ts: Date.now() });
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
      // Push notification for incoming call — always send even if partner is online
      // (app may be backgrounded so they'd miss the socket event)
      const callBody = data.callType === 'video' ? '點擊接聽視訊通話' : '點擊接聽語音通話';
      sendCallPush(partnerId, { title: `📞 ${socket.user.username} 正在呼叫你`, body: callBody, tag: 'call', url: '/call' });
      sendNtfy(partnerId, `📞 ${socket.user.username} 正在呼叫你`, callBody, 'telephone_receiver');
    }
  });

  socket.on('answer-call', (data) => {
    const coupleId = getCoupleId(socket.user.id);
    if (coupleId) {
      pendingCalls.delete(String(coupleId));
      socket.to(coupleId).emit('call-answered', data);
    }
  });

  socket.on('end-call', () => {
    const coupleId = getCoupleId(socket.user.id);
    if (coupleId) {
      pendingCalls.delete(String(coupleId));
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
    const result = db.prepare(
      'UPDATE messages SET read_at = ? WHERE couple_id = ? AND sender_id != ? AND read_at IS NULL'
    ).run(now, coupleId, userId);
    if (result.changes > 0) {
      socket.to(coupleId).emit('messages-read', { read_at: now });
    }
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
      // If the caller disconnects, clear the pending call
      const pending = pendingCalls.get(String(coupleId));
      if (pending && pending.fromId === socket.user.id) pendingCalls.delete(String(coupleId));
      socket.to(coupleId).emit('call-ended');
      socket.to(coupleId).emit('partner-status', { userId: socket.user.id, online: false });
    }
  });
});

// ── Daily date reminder scheduler ──────────────────────────────
// Fires every day at 08:00 server time; notifies both couple members
// when a special date is TODAY or exactly 2 days away.

function checkUpcomingDates() {
  try {
    const now = new Date();
    const todayStr = toLocalDateStr(now);
    const in2Days  = new Date(now); in2Days.setDate(in2Days.getDate() + 2);
    const in2Str   = toLocalDateStr(in2Days);

    // ── 1. Check special_dates (notify both couple members) ──
    const allDates = db.prepare('SELECT sd.*, c.user1_id, c.user2_id FROM special_dates sd JOIN couples c ON sd.couple_id = c.id').all();
    for (const d of allDates) {
      const [, month, day] = d.date.split('-');
      for (const target of [todayStr, in2Str]) {
        const [, tm, td] = target.split('-');
        const matches = d.repeat_yearly ? (tm === month && td === day) : (d.date === target);
        if (!matches) continue;
        const isToday = target === todayStr;
        const titleLine = isToday ? `${d.emoji} 今天是「${d.title}」！` : `${d.emoji} 再 2 天就是「${d.title}」！`;
        const bodyLine  = isToday ? '一起慶祝吧 💕' : '別忘了提前準備喔 💕';
        const payload   = { title: titleLine, body: bodyLine, tag: `date-${d.id}-${target}`, url: '/dates' };
        for (const uid of [d.user1_id, d.user2_id].filter(Boolean)) {
          sendPush(uid, payload);
          sendNtfy(uid, titleLine, bodyLine, 'calendar');
        }
        console.log(`[DateReminder] "${d.title}" (${isToday ? '今天' : '2天後'})`);
      }
    }

    // ── 2. Check users' birthdays (notify only the partner) ──
    const couples = db.prepare('SELECT * FROM couples WHERE user2_id IS NOT NULL').all();
    for (const c of couples) {
      for (const [selfId, partnerId] of [[c.user1_id, c.user2_id], [c.user2_id, c.user1_id]]) {
        const u = db.prepare('SELECT username, birthday FROM users WHERE id = ?').get(selfId);
        if (!u?.birthday) continue;
        const [, bMonth, bDay] = u.birthday.split('-');
        for (const target of [todayStr, in2Str]) {
          const [, tm, td] = target.split('-');
          if (tm !== bMonth || td !== bDay) continue;
          const isToday = target === todayStr;
          const titleLine = isToday
            ? `🎂 今天是 ${u.username} 的生日！`
            : `🎂 再 2 天就是 ${u.username} 的生日！`;
          const bodyLine = isToday ? '記得說生日快樂 🎉' : '提前準備個驚喜吧 💕';
          const payload  = { title: titleLine, body: bodyLine, tag: `bday-${selfId}-${target}`, url: '/dates' };
          sendPush(partnerId, payload);
          sendNtfy(partnerId, titleLine, bodyLine, 'birthday');
          console.log(`[DateReminder] ${u.username} 的生日 → 通知 ${partnerId}`);
        }
      }
    }
  } catch (err) {
    console.error('[DateReminder] Error:', err.message);
  }
}

function toLocalDateStr(d) {
  return d.getFullYear() + '-'
    + String(d.getMonth() + 1).padStart(2, '0') + '-'
    + String(d.getDate()).padStart(2, '0');
}

function scheduleNextDailyRun(fn) {
  const now = new Date();
  const next = new Date(now);
  next.setHours(8, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const ms = next - now;
  console.log(`[DateReminder] Next check at ${next.toLocaleString()} (in ${Math.round(ms / 60000)} min)`);
  setTimeout(() => { fn(); scheduleNextDailyRun(fn); }, ms);
}

scheduleNextDailyRun(checkUpcomingDates);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
