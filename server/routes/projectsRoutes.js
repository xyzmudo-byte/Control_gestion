import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// GET /api/projects
router.get('/', (req, res) => {
  res.json(db.getEntity('projects'));
});

// POST /api/projects
router.post('/', (req, res) => {
  const project = req.body;
  if (!project || !project.id || !project.name) {
    return res.status(400).json({ error: 'Proyecto incompleto' });
  }
  const created = db.createItem('projects', project);
  res.status(201).json(created);
});

// PUT /api/projects/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const updated = db.updateItem('projects', id, updates);
  if (!updated) {
    return res.status(404).json({ error: 'Proyecto no encontrado' });
  }
  res.json(updated);
});

// DELETE /api/projects/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const deleted = db.deleteItem('projects', id);
  if (!deleted) {
    return res.status(404).json({ error: 'Proyecto no encontrado' });
  }
  // Limpiar hitos y tareas asociadas
  const state = db.getState();
  state.projectMilestones = (state.projectMilestones || []).filter((m) => m.projectId !== id);
  state.projectTasks = (state.projectTasks || []).filter((t) => t.projectId !== id);
  db.saveState(state);

  res.json({ success: true, id });
});

// Hitos
router.post('/:id/milestones', (req, res) => {
  const { id } = req.params;
  const milestone = req.body;
  const created = db.createItem('projectMilestones', { ...milestone, projectId: id });
  res.status(201).json(created);
});

router.put('/milestones/:milestoneId', (req, res) => {
  const { milestoneId } = req.params;
  const updated = db.updateItem('projectMilestones', milestoneId, req.body);
  res.json(updated);
});

router.delete('/milestones/:milestoneId', (req, res) => {
  const { milestoneId } = req.params;
  db.deleteItem('projectMilestones', milestoneId);
  res.json({ success: true });
});

// Tareas
router.post('/:id/tasks', (req, res) => {
  const { id } = req.params;
  const task = req.body;
  const created = db.createItem('projectTasks', { ...task, projectId: id });
  res.status(201).json(created);
});

router.put('/tasks/:taskId', (req, res) => {
  const { taskId } = req.params;
  const updated = db.updateItem('projectTasks', taskId, req.body);
  res.json(updated);
});

router.delete('/tasks/:taskId', (req, res) => {
  const { taskId } = req.params;
  db.deleteItem('projectTasks', taskId);
  res.json({ success: true });
});

export default router;
