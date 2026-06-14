const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// All routes require auth
router.use(authMiddleware);

// POST /api/couples/create
router.post('/create', (req, res) => {
  try {
    const { couple_date } = req.body;
    const userId = req.user.id;

    // Check if user already has a couple
    const existing = db.prepare(
      'SELECT id FROM couples WHERE user1_id = ? OR user2_id = ?'
    ).get(userId, userId);
    if (existing) {
      return res.status(409).json({ error: 'You are already part of a couple' });
    }

    const id = uuidv4();
    const invite_code = uuidv4().split('-')[0].toUpperCase(); // Short invite code

    db.prepare(
      'INSERT INTO couples (id, user1_id, invite_code, couple_date) VALUES (?, ?, ?, ?)'
    ).run(id, userId, invite_code, couple_date || null);

    const couple = db.prepare('SELECT * FROM couples WHERE id = ?').get(id);
    return res.status(201).json({ couple });
  } catch (err) {
    console.error('Create couple error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/couples/join
router.post('/join', (req, res) => {
  try {
    const { invite_code } = req.body;
    const userId = req.user.id;

    if (!invite_code) {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    // Check if user already has a couple
    const alreadyIn = db.prepare(
      'SELECT id FROM couples WHERE user1_id = ? OR user2_id = ?'
    ).get(userId, userId);
    if (alreadyIn) {
      return res.status(409).json({ error: 'You are already part of a couple' });
    }

    const couple = db.prepare(
      'SELECT * FROM couples WHERE invite_code = ?'
    ).get(invite_code.toUpperCase());

    if (!couple) {
      return res.status(404).json({ error: 'Invite code not found' });
    }
    if (couple.user2_id) {
      return res.status(409).json({ error: 'This couple is already full' });
    }
    if (couple.user1_id === userId) {
      return res.status(400).json({ error: 'You cannot join your own couple' });
    }

    db.prepare('UPDATE couples SET user2_id = ? WHERE id = ?').run(userId, couple.id);

    const updated = db.prepare('SELECT * FROM couples WHERE id = ?').get(couple.id);
    return res.json({ couple: updated });
  } catch (err) {
    console.error('Join couple error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/couples/info
router.get('/info', (req, res) => {
  try {
    const userId = req.user.id;

    const couple = db.prepare(
      'SELECT * FROM couples WHERE user1_id = ? OR user2_id = ?'
    ).get(userId, userId);

    if (!couple) {
      return res.status(404).json({ error: 'No couple found' });
    }

    const partnerId = couple.user1_id === userId ? couple.user2_id : couple.user1_id;
    let partner = null;
    if (partnerId) {
      partner = db.prepare(
        'SELECT id, username, avatar FROM users WHERE id = ?'
      ).get(partnerId);
    }

    const me = db.prepare(
      'SELECT id, username, avatar FROM users WHERE id = ?'
    ).get(userId);

    // Calculate days together
    let daysTogether = 0;
    if (couple.couple_date) {
      const start = new Date(couple.couple_date);
      const now = new Date();
      daysTogether = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    }

    return res.json({
      couple,
      partner,
      me,
      daysTogether
    });
  } catch (err) {
    console.error('Couple info error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
