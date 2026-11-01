import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// GET /api/timetracker - Obtener registros de tiempo (con soporte de filtros ?userId=&date=)
router.get('/', (req, res) => {
  try {
    const { userId, date } = req.query;
    let entries = db.getEntity('timeEntries') || [];

    if (userId) {
      entries = entries.filter((e) => e.userId === userId);
    }
    if (date) {
      entries = entries.filter((e) => e.date === date);
    }

    res.json(entries);
  } catch (err) {
    console.error('Error al obtener time entries:', err);
    res.status(500).json({ error: 'Error interno al consultar registros de tiempo' });
  }
});

// POST /api/timetracker - Crear un nuevo registro o iniciar cronómetro
router.post('/', (req, res) => {
  try {
    const entry = req.body;
    if (!entry || !entry.userId || !entry.activity) {
      return res.status(400).json({ error: 'Faltan campos obligatorios (userId, activity)' });
    }

    const state = db.getState();
    const existingEntries = Array.isArray(state.timeEntries) ? state.timeEntries : [];

    // Si el nuevo registro inicia cronómetro (isRunning: true), detener automáticamente cualquier cronómetro anterior que tuviera este mismo usuario
    if (entry.isRunning) {
      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      existingEntries.forEach((e) => {
        if (e.userId === entry.userId && e.isRunning) {
          e.isRunning = false;
          if (!e.endTime) {
            e.endTime = currentHHMM;
          }
          e.updatedAt = new Date().toISOString();
        }
      });
    }

    const newId = entry.id || `time-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newEntry = {
      ...entry,
      id: newId,
      createdAt: entry.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    existingEntries.push(newEntry);
    state.timeEntries = existingEntries;
    db.saveState(state);

    res.status(201).json(newEntry);
  } catch (err) {
    console.error('Error al crear time entry:', err);
    res.status(500).json({ error: 'Error interno al guardar registro de tiempo' });
  }
});

// PUT /api/timetracker/:id - Actualizar registro o detener cronómetro
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = db.updateItem('timeEntries', id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    if (!updated) {
      return res.status(404).json({ error: 'Registro de tiempo no encontrado' });
    }

    res.json(updated);
  } catch (err) {
    console.error('Error al actualizar time entry:', err);
    res.status(500).json({ error: 'Error interno al actualizar registro de tiempo' });
  }
});

// DELETE /api/timetracker/:id - Eliminar registro
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = db.deleteItem('timeEntries', id);

    if (!deleted) {
      return res.status(404).json({ error: 'Registro de tiempo no encontrado' });
    }

    res.json({ success: true, id });
  } catch (err) {
    console.error('Error al eliminar time entry:', err);
    res.status(500).json({ error: 'Error interno al eliminar registro de tiempo' });
  }
});

export default router;

