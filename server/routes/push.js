const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'couples-secret-key-2024';

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}

// Return VAPID public key so client can subscribe
router.get('/vapid-public-key', (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY || 'BGYDOxblN6Y1gGbS4Nz2HZQtNpAfhZDBaSmIrKNHU-sGbHq9iUkJdZFdDBKRCvCaUWTPxt35RedsDc9hOQOyjqY' });
});

// Save push subscription for this user
router.post('/subscribe', auth, (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys) return res.status(400).json({ error: 'Invalid subscription' });
  // Delete old subscriptions for this user with same endpoint
  db.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND subscription LIKE ?')
    .run(req.user.id, `%${endpoint.slice(-40)}%`);
  const id = uuidv4();
  db.prepare('INSERT INTO push_subscriptions (id, user_id, subscription) VALUES (?, ?, ?)')
    .run(id, req.user.id, JSON.stringify(req.body));
  res.json({ ok: true });
});

// Remove push subscription (on logout)
router.delete('/subscribe', auth, (req, res) => {
  const { endpoint } = req.body;
  if (endpoint) {
    db.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND subscription LIKE ?')
      .run(req.user.id, `%${endpoint.slice(-40)}%`);
  } else {
    db.prepare('DELETE FROM push_subscriptions WHERE user_id = ?').run(req.user.id);
  }
  res.json({ ok: true });
});

// Save ntfy topic for this user
router.post('/ntfy', auth, (req, res) => {
  const { topic } = req.body;
  if (!topic || topic.trim().length < 3) return res.status(400).json({ error: '頻道名稱太短' });
  db.prepare('UPDATE users SET ntfy_topic = ? WHERE id = ?').run(topic.trim(), req.user.id);
  res.json({ ok: true });
});

// Get current ntfy topic
router.get('/ntfy', auth, (req, res) => {
  const row = db.prepare('SELECT ntfy_topic FROM users WHERE id = ?').get(req.user.id);
  res.json({ topic: row?.ntfy_topic || '' });
});

module.exports = router;
