const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const multer = require('multer');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, 'avatar-' + uuidv4() + path.extname(file.originalname || '.jpg')),
});
const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    file.mimetype.startsWith('image/')
      ? cb(null, true) : cb(new Error('Image only'), false),
});

const JWT_SECRET = process.env.JWT_SECRET || 'couples-secret-key-2024';
const RESET_SECRET = (process.env.JWT_SECRET || 'couples-secret-key-2024') + '-reset';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: '請填寫所有必填欄位' });
    }
    if (typeof username !== 'string' || username.length < 2 || username.length > 30) {
      return res.status(400).json({ error: '使用者名稱需 2-30 個字元' });
    }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
      return res.status(400).json({ error: 'Email 格式不正確' });
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return res.status(400).json({ error: '密碼需 8-128 個字元' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email.toLowerCase(), username);
    if (existingUser) {
      return res.status(409).json({ error: '此 Email 或使用者名稱已被使用' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const id = uuidv4();

    db.prepare(
      'INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)'
    ).run(id, username, email, password_hash);

    const token = jwt.sign({ id, email, username }, JWT_SECRET, { expiresIn: '30d' });

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id, username, email }
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: '請填寫 Email 和密碼' });
    }
    if (email.length > 200 || password.length > 128) {
      return res.status(400).json({ error: '輸入內容超過長度限制' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, email, avatar, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ user });
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/avatar — upload profile photo
router.post('/avatar', authMiddleware, avatarUpload.single('avatar'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const avatarPath = `/uploads/${req.file.filename}`;
    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatarPath, req.user.id);
    const user = db.prepare('SELECT id, username, email, avatar FROM users WHERE id = ?').get(req.user.id);
    return res.json({ user });
  } catch (err) {
    console.error('Avatar upload error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/auth/birthday — save user's birthday
router.patch('/birthday', authMiddleware, (req, res) => {
  try {
    const { birthday } = req.body;
    // Allow clearing (null/empty) or a valid YYYY-MM-DD
    const value = birthday && /^\d{4}-\d{2}-\d{2}$/.test(birthday) ? birthday : null;
    db.prepare('UPDATE users SET birthday = ? WHERE id = ?').run(value, req.user.id);
    return res.json({ ok: true, birthday: value });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/auth/avatar — remove profile photo
router.delete('/avatar', authMiddleware, (req, res) => {
  try {
    db.prepare('UPDATE users SET avatar = NULL WHERE id = ?').run(req.user.id);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/device-token — register or refresh a device token (requires login)
router.post('/device-token', authMiddleware, (req, res) => {
  try {
    const { token, deviceName } = req.body;
    if (!token || token.length < 16) return res.status(400).json({ error: 'Invalid token' });

    const existing = db.prepare('SELECT id FROM device_tokens WHERE token = ?').get(token);
    if (existing) {
      db.prepare('UPDATE device_tokens SET last_seen = datetime(\'now\'), device_name = ? WHERE token = ?')
        .run(deviceName || null, token);
    } else {
      db.prepare(
        'INSERT INTO device_tokens (id, user_id, token, device_name) VALUES (?, ?, ?, ?)'
      ).run(uuidv4(), req.user.id, token, deviceName || null);
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('Device token error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/device-tokens — list bound devices, marks the calling device as current
router.get('/device-tokens', authMiddleware, (req, res) => {
  try {
    const currentToken = req.query.dt || '';
    const rows = db.prepare(
      'SELECT id, device_name, last_seen, created_at, token FROM device_tokens WHERE user_id = ? ORDER BY last_seen DESC'
    ).all(req.user.id);
    const tokens = rows.map(r => ({
      id: r.id,
      device_name: r.device_name,
      last_seen: r.last_seen,
      created_at: r.created_at,
      is_current: currentToken ? r.token === currentToken : false,
    }));
    return res.json({ tokens });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/auth/device-tokens/:id — remove a bound device
router.delete('/device-tokens/:id', authMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM device_tokens WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/forgot-password — verify email + device token → short-lived reset JWT
router.post('/forgot-password', (req, res) => {
  try {
    const { email, deviceToken } = req.body;
    if (!email || !deviceToken) {
      return res.status(400).json({ error: '缺少必要欄位' });
    }

    const user = db.prepare('SELECT id, username FROM users WHERE email = ?').get(email);
    if (!user) {
      // Don't reveal whether email exists — generic error
      return res.status(400).json({ error: '找不到此帳號，或此裝置未綁定' });
    }

    const row = db.prepare('SELECT id FROM device_tokens WHERE user_id = ? AND token = ?').get(user.id, deviceToken);
    if (!row) {
      return res.status(400).json({ error: '找不到此帳號，或此裝置未綁定' });
    }

    // Update last_seen
    db.prepare('UPDATE device_tokens SET last_seen = datetime(\'now\') WHERE id = ?').run(row.id);

    // Issue short-lived reset token (15 min)
    const resetToken = jwt.sign({ userId: user.id, reset: true }, RESET_SECRET, { expiresIn: '15m' });
    return res.json({ resetToken, username: user.username });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/reset-password — consume reset JWT, set new password
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: '新密碼至少需要 6 個字元' });
    }

    let payload;
    try {
      payload = jwt.verify(resetToken, RESET_SECRET);
    } catch {
      return res.status(400).json({ error: '重設連結已失效，請重新申請' });
    }

    if (!payload.reset) return res.status(400).json({ error: '無效的重設憑證' });

    const password_hash = await bcrypt.hash(newPassword, 12);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(password_hash, payload.userId);

    return res.json({ ok: true });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
