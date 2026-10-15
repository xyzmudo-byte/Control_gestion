import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// GET /api/deliverables
router.get('/', (req, res) => {
  res.json(db.getEntity('deliverables'));
});

// POST /api/deliverables
router.post('/', (req, res) => {
  const deliverable = req.body;
  if (!deliverable || !deliverable.id || !deliverable.title) {
    return res.status(400).json({ error: 'Entregable incompleto' });
  }
  const created = db.createItem('deliverables', deliverable);
  res.status(201).json(created);
});

// PUT /api/deliverables/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const updated = db.updateItem('deliverables', id, updates);
  if (!updated) {
    return res.status(404).json({ error: 'Entregable no encontrado' });
  }
  res.json(updated);
});

// DELETE /api/deliverables/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const deleted = db.deleteItem('deliverables', id);
  if (!deleted) {
    return res.status(404).json({ error: 'Entregable no encontrado' });
  }
  // También limpiar actualizaciones asociadas
  const updates = db.getEntity('deliverableUpdates');
  const filtered = updates.filter((u) => u.deliverableId !== id);
  const state = db.getState();
  state.deliverableUpdates = filtered;
  db.saveState(state);

  res.json({ success: true, id });
});

// POST /api/deliverables/:id/updates
router.post('/:id/updates', (req, res) => {
  const { id } = req.params;
  const update = req.body;
  if (!update || !update.id) {
    return res.status(400).json({ error: 'Datos de actualización requeridos' });
  }
  const created = db.createItem('deliverableUpdates', { ...update, deliverableId: id });
  res.status(201).json(created);
});

export default router;
