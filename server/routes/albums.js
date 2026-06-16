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
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Images only'), false),
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.use(authMiddleware);

function getCoupleForUser(userId) {
  return db.prepare('SELECT * FROM couples WHERE user1_id = ? OR user2_id = ?').get(userId, userId);
}

function getAlbumFiles(albumId) {
  return db.prepare('SELECT file_path FROM album_files WHERE album_id = ? ORDER BY order_num, created_at').all(albumId).map(r => r.file_path);
}

// GET /api/albums — list all albums for the couple (with cover + count)
router.get('/', (req, res) => {
  try {
    const couple = getCoupleForUser(req.user.id);
    if (!couple) return res.status(404).json({ error: 'No couple found' });

    const albums = db.prepare(
      'SELECT a.*, u.username FROM albums a JOIN users u ON a.user_id = u.id WHERE a.couple_id = ? ORDER BY a.created_at DESC'
    ).all(couple.id);

    const result = albums.map(a => {
      const files = getAlbumFiles(a.id);
      return { ...a, files, cover: files[0] || null, count: files.length };
    });

    return res.json({ albums: result });
  } catch (err) {
    console.error('Get albums error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/albums — create album with name + optional initial photos
router.post('/', upload.array('files', 50), (req, res) => {
  try {
    const couple = getCoupleForUser(req.user.id);
    if (!couple) return res.status(404).json({ error: 'No couple found' });

    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: '相簿名稱不可為空' });

    const id = uuidv4();
    db.prepare('INSERT INTO albums (id, couple_id, user_id, name) VALUES (?, ?, ?, ?)')
      .run(id, couple.id, req.user.id, name.trim());

    const files = req.files || [];
    const insertFile = db.prepare('INSERT INTO album_files (id, album_id, file_path, order_num) VALUES (?, ?, ?, ?)');
    files.forEach((f, i) => insertFile.run(uuidv4(), id, `/uploads/${f.filename}`, i));

    const filePaths = getAlbumFiles(id);
    const album = db.prepare('SELECT a.*, u.username FROM albums a JOIN users u ON a.user_id = u.id WHERE a.id = ?').get(id);
    return res.status(201).json({ album: { ...album, files: filePaths, cover: filePaths[0] || null, count: filePaths.length } });
  } catch (err) {
    console.error('Create album error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/albums/:id
router.get('/:id', (req, res) => {
  try {
    const couple = getCoupleForUser(req.user.id);
    if (!couple) return res.status(404).json({ error: 'No couple found' });

    const album = db.prepare('SELECT a.*, u.username FROM albums a JOIN users u ON a.user_id = u.id WHERE a.id = ? AND a.couple_id = ?').get(req.params.id, couple.id);
    if (!album) return res.status(404).json({ error: 'Album not found' });

    const files = getAlbumFiles(album.id);
    return res.json({ album: { ...album, files, cover: files[0] || null, count: files.length } });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/albums/:id — rename
router.patch('/:id', (req, res) => {
  try {
    const couple = getCoupleForUser(req.user.id);
    if (!couple) return res.status(404).json({ error: 'No couple found' });

    const album = db.prepare('SELECT * FROM albums WHERE id = ? AND couple_id = ?').get(req.params.id, couple.id);
    if (!album) return res.status(404).json({ error: 'Album not found' });

    const { name } = req.body;
    if (name && name.trim()) {
      db.prepare('UPDATE albums SET name = ? WHERE id = ?').run(name.trim(), req.params.id);
    }
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/albums/:id/files — add more photos
router.post('/:id/files', upload.array('files', 50), (req, res) => {
  try {
    const couple = getCoupleForUser(req.user.id);
    if (!couple) return res.status(404).json({ error: 'No couple found' });

    const album = db.prepare('SELECT * FROM albums WHERE id = ? AND couple_id = ?').get(req.params.id, couple.id);
    if (!album) return res.status(404).json({ error: 'Album not found' });

    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: 'No files' });

    const maxRow = db.prepare('SELECT MAX(order_num) as m FROM album_files WHERE album_id = ?').get(req.params.id);
    let orderStart = (maxRow?.m ?? -1) + 1;

    const insertFile = db.prepare('INSERT INTO album_files (id, album_id, file_path, order_num) VALUES (?, ?, ?, ?)');
    files.forEach((f, i) => insertFile.run(uuidv4(), req.params.id, `/uploads/${f.filename}`, orderStart + i));

    return res.json({ files: getAlbumFiles(req.params.id) });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/albums/:id
router.delete('/:id', (req, res) => {
  try {
    const couple = getCoupleForUser(req.user.id);
    if (!couple) return res.status(404).json({ error: 'No couple found' });

    const album = db.prepare('SELECT * FROM albums WHERE id = ? AND couple_id = ?').get(req.params.id, couple.id);
    if (!album) return res.status(404).json({ error: 'Album not found' });

    db.prepare('DELETE FROM album_files WHERE album_id = ?').run(req.params.id);
    db.prepare('DELETE FROM albums WHERE id = ?').run(req.params.id);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
