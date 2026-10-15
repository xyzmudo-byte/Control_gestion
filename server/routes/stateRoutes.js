import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// GET /api/health
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Control de Gestión API',
    timestamp: new Date().toISOString(),
    clientsConnected: true,
  });
});

// GET /api/state - Devuelve el estado completo
router.get('/state', (req, res) => {
  try {
    const state = db.getState();
    res.json(state);
  } catch (err) {
    console.error('Error al obtener estado:', err);
    res.status(500).json({ error: 'Error interno al leer estado' });
  }
});

// POST /api/state - Actualiza/guarda el estado completo
router.post('/state', (req, res) => {
  try {
    const newState = req.body;
    if (!newState || typeof newState !== 'object') {
      return res.status(400).json({ error: 'Formato de estado inválido' });
    }
    const saved = db.saveState(newState);
    res.json({ success: true, state: saved });
  } catch (err) {
    console.error('Error al guardar estado:', err);
    res.status(500).json({ error: 'Error interno al guardar estado' });
  }
});

// POST /api/state/backup - Genera un respaldo manual de los datos
router.post('/state/backup', (req, res) => {
  try {
    const backupFile = db.createBackup();
    if (backupFile) {
      res.json({ success: true, backupFile });
    } else {
      res.status(500).json({ error: 'No se pudo generar el respaldo' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
