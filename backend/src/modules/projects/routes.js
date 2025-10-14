import express from 'express';
import projectsController from './controller.js';

const router = express.Router();

// Projects CRUD
router.post('/', projectsController.create.bind(projectsController));
router.get('/', projectsController.getAll.bind(projectsController));
router.get('/:id', projectsController.getById.bind(projectsController));
router.put('/:id', projectsController.update.bind(projectsController));
router.delete('/:id', projectsController.delete.bind(projectsController));

export default router;
