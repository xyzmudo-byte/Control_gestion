import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(db.getEntity('chatMessages'));
});

router.post('/', (req, res) => {
  const message = req.body;
  if (!message || !message.id || !message.message) {
    return res.status(400).json({ error: 'Mensaje de chat incompleto' });
  }
  const created = db.createItem('chatMessages', message);
  res.status(201).json(created);
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const updated = db.updateItem('chatMessages', id, req.body);
  if (!updated) return res.status(404).json({ error: 'Mensaje no encontrado' });
  res.json(updated);
});

export default router;
