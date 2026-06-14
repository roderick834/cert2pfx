const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// All routes require auth
router.use(authMiddleware);

// Helper: get couple for user
function getCoupleForUser(userId) {
  return db.prepare(
    'SELECT * FROM couples WHERE user1_id = ? OR user2_id = ?'
  ).get(userId, userId);
}

// GET /api/messages
router.get('/', (req, res) => {
  try {
    const couple = getCoupleForUser(req.user.id);
    if (!couple) {
      return res.status(404).json({ error: 'No couple found' });
    }

    const messages = db.prepare(`
      SELECT m.*, u.username, u.avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.couple_id = ?
      ORDER BY m.created_at DESC
      LIMIT 100
    `).all(couple.id);

    // Return in chronological order (oldest first)
    messages.reverse();

    return res.json({ messages });
  } catch (err) {
    console.error('Get messages error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
