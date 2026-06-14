const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// Multer config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpg|jpeg|png|gif|mp4|webm/i;
  const ext = path.extname(file.originalname).slice(1);
  if (allowed.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });

// All routes require auth
router.use(authMiddleware);

// Helper: get couple for user
function getCoupleForUser(userId) {
  return db.prepare(
    'SELECT * FROM couples WHERE user1_id = ? OR user2_id = ?'
  ).get(userId, userId);
}

// GET /api/memories
router.get('/', (req, res) => {
  try {
    const couple = getCoupleForUser(req.user.id);
    if (!couple) {
      return res.status(404).json({ error: 'No couple found' });
    }

    const memories = db.prepare(`
      SELECT m.*, u.username, u.avatar
      FROM memories m
      JOIN users u ON m.user_id = u.id
      WHERE m.couple_id = ?
      ORDER BY m.created_at DESC
    `).all(couple.id);

    return res.json({ memories });
  } catch (err) {
    console.error('Get memories error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/memories
router.post('/', upload.single('file'), (req, res) => {
  try {
    const couple = getCoupleForUser(req.user.id);
    if (!couple) {
      return res.status(404).json({ error: 'No couple found' });
    }

    const { type, content, date } = req.body;
    if (!type || !['photo', 'video', 'text'].includes(type)) {
      return res.status(400).json({ error: 'Valid type (photo/video/text) is required' });
    }

    let file_path = null;
    if (req.file) {
      file_path = `/uploads/${req.file.filename}`;
    }

    if (type !== 'text' && !file_path) {
      return res.status(400).json({ error: 'File is required for photo/video memories' });
    }
    if (type === 'text' && !content) {
      return res.status(400).json({ error: 'Content is required for text memories' });
    }

    const id = uuidv4();
    db.prepare(
      'INSERT INTO memories (id, couple_id, user_id, type, content, file_path, date) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, couple.id, req.user.id, type, content || null, file_path, date || new Date().toISOString().split('T')[0]);

    const memory = db.prepare(`
      SELECT m.*, u.username, u.avatar
      FROM memories m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `).get(id);

    return res.status(201).json({ memory });
  } catch (err) {
    console.error('Create memory error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/memories/:id
router.delete('/:id', (req, res) => {
  try {
    const memory = db.prepare('SELECT * FROM memories WHERE id = ?').get(req.params.id);
    if (!memory) {
      return res.status(404).json({ error: 'Memory not found' });
    }
    if (memory.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own memories' });
    }

    db.prepare('DELETE FROM memories WHERE id = ?').run(req.params.id);
    return res.json({ message: 'Memory deleted successfully' });
  } catch (err) {
    console.error('Delete memory error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
