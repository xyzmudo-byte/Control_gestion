import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(db.getEntity('ideas'));
});

router.post('/', (req, res) => {
  const idea = req.body;
  if (!idea || !idea.id || !idea.title) {
    return res.status(400).json({ error: 'Idea incompleta' });
  }
  const created = db.createItem('ideas', idea);
  res.status(201).json(created);
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const updated = db.updateItem('ideas', id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Idea no encontrada' });
  }
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const deleted = db.deleteItem('ideas', id);
  if (!deleted) {
    return res.status(404).json({ error: 'Idea no encontrada' });
  }
  res.json({ success: true, id });
});

export default router;
