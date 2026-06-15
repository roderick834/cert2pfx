const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname)),
});

const fileFilter = (req, file, cb) => {
  if (/jpg|jpeg|png|gif|mp4|webm|mov/i.test(path.extname(file.originalname).slice(1))) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });

router.use(authMiddleware);

function getCoupleForUser(userId) {
  return db.prepare('SELECT * FROM couples WHERE user1_id = ? OR user2_id = ?').get(userId, userId);
}

function getMemoryFiles(memoryId, legacyFilePath) {
  const rows = db.prepare('SELECT file_path FROM memory_files WHERE memory_id = ? ORDER BY order_num').all(memoryId);
  if (rows.length > 0) return rows.map(r => r.file_path);
  if (legacyFilePath) return [legacyFilePath];
  return [];
}

// GET /api/memories
router.get('/', (req, res) => {
  try {
    const couple = getCoupleForUser(req.user.id);
    if (!couple) return res.status(404).json({ error: 'No couple found' });

    const memories = db.prepare(`
      SELECT m.*, u.username, u.avatar
      FROM memories m
      JOIN users u ON m.user_id = u.id
      WHERE m.couple_id = ?
      ORDER BY COALESCE(m.date, m.created_at) DESC
    `).all(couple.id);

    const result = memories.map(m => ({
      ...m,
      files: getMemoryFiles(m.id, m.file_path),
    }));

    return res.json({ memories: result });
  } catch (err) {
    console.error('Get memories error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/memories — accept up to 20 files
router.post('/', upload.array('files', 20), (req, res) => {
  try {
    const couple = getCoupleForUser(req.user.id);
    if (!couple) return res.status(404).json({ error: 'No couple found' });

    const { type, content, date } = req.body;
    if (!type || !['photo', 'video', 'text'].includes(type)) {
      return res.status(400).json({ error: 'Valid type required' });
    }

    const files = req.files || [];
    if (type !== 'text' && files.length === 0) {
      return res.status(400).json({ error: 'File is required for photo/video memories' });
    }
    if (type === 'text' && !content) {
      return res.status(400).json({ error: 'Content is required for text memories' });
    }

    const id = uuidv4();
    // Keep file_path for backward compat (first file)
    const firstFilePath = files.length > 0 ? `/uploads/${files[0].filename}` : null;

    db.prepare(
      'INSERT INTO memories (id, couple_id, user_id, type, content, file_path, date) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, couple.id, req.user.id, type, content || null, firstFilePath, date || new Date().toISOString().split('T')[0]);

    // Insert all files into memory_files
    const insertFile = db.prepare('INSERT INTO memory_files (id, memory_id, file_path, order_num) VALUES (?, ?, ?, ?)');
    files.forEach((f, i) => {
      insertFile.run(uuidv4(), id, `/uploads/${f.filename}`, i);
    });

    const memory = db.prepare(`
      SELECT m.*, u.username, u.avatar
      FROM memories m JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `).get(id);

    return res.status(201).json({
      memory: { ...memory, files: getMemoryFiles(id, firstFilePath) }
    });
  } catch (err) {
    console.error('Create memory error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/memories/:id
router.delete('/:id', (req, res) => {
  try {
    const memory = db.prepare('SELECT * FROM memories WHERE id = ?').get(req.params.id);
    if (!memory) return res.status(404).json({ error: 'Memory not found' });
    if (memory.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    db.prepare('DELETE FROM memory_files WHERE memory_id = ?').run(req.params.id);
    db.prepare('DELETE FROM memories WHERE id = ?').run(req.params.id);
    return res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Delete memory error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
