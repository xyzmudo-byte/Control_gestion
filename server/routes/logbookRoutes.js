import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(db.getEntity('logbook'));
});

router.post('/', (req, res) => {
  const item = req.body;
  if (!item || !item.id || !item.title) {
    return res.status(400).json({ error: 'Registro de bitácora incompleto' });
  }
  const created = db.createItem('logbook', item);
  res.status(201).json(created);
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const updated = db.updateItem('logbook', id, req.body);
  if (!updated) return res.status(404).json({ error: 'Registro no encontrado' });
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const deleted = db.deleteItem('logbook', id);
  if (!deleted) return res.status(404).json({ error: 'Registro no encontrado' });
  res.json({ success: true, id });
});

export default router;
