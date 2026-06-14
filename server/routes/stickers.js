const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
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

// GET /api/stickers
router.get('/', (req, res) => {
  try {
    const couple = getCoupleForUser(req.user.id);
    if (!couple) {
      return res.status(404).json({ error: 'No couple found' });
    }

    const stickers = db.prepare(`
      SELECT s.*, u.username
      FROM stickers s
      JOIN users u ON s.user_id = u.id
      WHERE s.couple_id = ?
      ORDER BY s.created_at DESC
    `).all(couple.id);

    return res.json({ stickers });
  } catch (err) {
    console.error('Get stickers error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/stickers
router.post('/', (req, res) => {
  try {
    const couple = getCoupleForUser(req.user.id);
    if (!couple) {
      return res.status(404).json({ error: 'No couple found' });
    }

    const { name, image_data } = req.body;
    if (!name || !image_data) {
      return res.status(400).json({ error: 'Name and image_data are required' });
    }

    const id = uuidv4();
    db.prepare(
      'INSERT INTO stickers (id, couple_id, user_id, name, image_data) VALUES (?, ?, ?, ?, ?)'
    ).run(id, couple.id, req.user.id, name, image_data);

    const sticker = db.prepare(`
      SELECT s.*, u.username
      FROM stickers s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `).get(id);

    return res.status(201).json({ sticker });
  } catch (err) {
    console.error('Create sticker error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/stickers/:id
router.delete('/:id', (req, res) => {
  try {
    const sticker = db.prepare('SELECT * FROM stickers WHERE id = ?').get(req.params.id);
    if (!sticker) {
      return res.status(404).json({ error: 'Sticker not found' });
    }
    if (sticker.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own stickers' });
    }

    db.prepare('DELETE FROM stickers WHERE id = ?').run(req.params.id);
    return res.json({ message: 'Sticker deleted successfully' });
  } catch (err) {
    console.error('Delete sticker error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
