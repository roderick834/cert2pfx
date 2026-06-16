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
  if (!couple) return res.json({ mine: null, partner: null });
  const notes = db.prepare(`
    SELECT n.*, u.username FROM love_notes n
    JOIN users u ON n.sender_id = u.id
    WHERE n.couple_id = ?
    ORDER BY n.created_at DESC
  `).all(couple.id);
  res.json({
    mine: notes.find(n => n.sender_id === req.user.id) || null,
    partner: notes.find(n => n.sender_id !== req.user.id) || null,
  });
});

router.post('/', auth, (req, res) => {
  const couple = getCouple(req.user.id);
  if (!couple) return res.status(400).json({ error: 'No couple' });
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Empty note' });
  db.prepare('DELETE FROM love_notes WHERE couple_id = ? AND sender_id = ?').run(couple.id, req.user.id);
  const id = uuidv4();
  db.prepare('INSERT INTO love_notes (id, couple_id, sender_id, content) VALUES (?, ?, ?, ?)')
    .run(id, couple.id, req.user.id, content.trim());
  const note = db.prepare(`
    SELECT n.*, u.username FROM love_notes n JOIN users u ON n.sender_id = u.id WHERE n.id = ?
  `).get(id);
  res.json({ note });
});

module.exports = router;
