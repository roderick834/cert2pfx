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

function getCouple(userId) {
  return db.prepare('SELECT * FROM couples WHERE user1_id = ? OR user2_id = ?').get(userId, userId);
}

router.get('/', auth, (req, res) => {
  const couple = getCouple(req.user.id);
  if (!couple) return res.json({ dates: [] });
  const dates = db.prepare(
    'SELECT * FROM special_dates WHERE couple_id = ? ORDER BY date ASC'
  ).all(couple.id);
  res.json({ dates });
});

router.post('/', auth, (req, res) => {
  const couple = getCouple(req.user.id);
  if (!couple) return res.status(400).json({ error: 'No couple' });
  const { title, date, repeat_yearly = 1, emoji = '🗓️' } = req.body;
  if (!title || !date) return res.status(400).json({ error: 'Missing fields' });
  const id = uuidv4();
  db.prepare(
    'INSERT INTO special_dates (id, couple_id, user_id, title, date, repeat_yearly, emoji) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, couple.id, req.user.id, title, date, repeat_yearly ? 1 : 0, emoji);
  res.json({ date: db.prepare('SELECT * FROM special_dates WHERE id = ?').get(id) });
});

router.delete('/:id', auth, (req, res) => {
  const couple = getCouple(req.user.id);
  if (!couple) return res.status(400).json({ error: 'No couple' });
  db.prepare('DELETE FROM special_dates WHERE id = ? AND couple_id = ?').run(req.params.id, couple.id);
  res.json({ ok: true });
});

module.exports = router;
