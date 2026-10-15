import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// Procesos
router.get('/processes', (req, res) => {
  res.json(db.getEntity('processes'));
});

router.post('/processes', (req, res) => {
  const process = req.body;
  if (!process || !process.id || !process.name) {
    return res.status(400).json({ error: 'Proceso incompleto' });
  }
  const created = db.createItem('processes', process);
  res.status(201).json(created);
});

router.put('/processes/:id', (req, res) => {
  const { id } = req.params;
  const updated = db.updateItem('processes', id, req.body);
  if (!updated) return res.status(404).json({ error: 'Proceso no encontrado' });
  res.json(updated);
});

router.delete('/processes/:id', (req, res) => {
  const { id } = req.params;
  const deleted = db.deleteItem('processes', id);
  if (!deleted) return res.status(404).json({ error: 'Proceso no encontrado' });
  res.json({ success: true, id });
});

// Responsabilidades
router.get('/responsibilities', (req, res) => {
  res.json(db.getEntity('responsibilities'));
});

router.post('/responsibilities', (req, res) => {
  const resp = req.body;
  if (!resp || !resp.id || !resp.title) {
    return res.status(400).json({ error: 'Responsabilidad incompleta' });
  }
  const created = db.createItem('responsibilities', resp);
  res.status(201).json(created);
});

router.put('/responsibilities/:id', (req, res) => {
  const { id } = req.params;
  const updated = db.updateItem('responsibilities', id, req.body);
  if (!updated) return res.status(404).json({ error: 'Responsabilidad no encontrada' });
  res.json(updated);
});

router.delete('/responsibilities/:id', (req, res) => {
  const { id } = req.params;
  const deleted = db.deleteItem('responsibilities', id);
  if (!deleted) return res.status(404).json({ error: 'Responsabilidad no encontrada' });
  res.json({ success: true, id });
});

// Ocurrencias
router.post('/occurrences', (req, res) => {
  const occ = req.body;
  const created = db.createItem('occurrences', occ);
  res.status(201).json(created);
});

router.put('/occurrences/:id', (req, res) => {
  const { id } = req.params;
  const updated = db.updateItem('occurrences', id, req.body);
  res.json(updated);
});

router.delete('/occurrences/:id', (req, res) => {
  const { id } = req.params;
  db.deleteItem('occurrences', id);
  res.json({ success: true });
});

export default router;
