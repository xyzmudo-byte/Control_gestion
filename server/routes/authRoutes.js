import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Ingresa usuario y contraseña' });
    }

    const user = db.authenticateUser(username, password);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Usuario o contraseña incorrectos' });
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ success: false, error: 'Error interno en autenticación' });
  }
});

// GET /api/auth/users - Lista pública de usuarios (sin contraseñas)
router.get('/users', (req, res) => {
  const state = db.getState();
  const safeUsers = (state.users || []).map(({ password, ...rest }) => rest);
  res.json(safeUsers);
});

export default router;
