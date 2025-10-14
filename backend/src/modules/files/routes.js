import express from 'express';
import filesController, { uploadMiddleware } from './controller.js';

const router = express.Router();

// Upload endpoint (NEW!)
router.post('/upload', uploadMiddleware, filesController.upload.bind(filesController));

// File CRUD
router.post('/', filesController.create.bind(filesController));
router.get('/', filesController.getAll.bind(filesController));
router.get('/:id', filesController.getById.bind(filesController));
router.delete('/:id', filesController.delete.bind(filesController));

// Upload workflow
router.post('/:id/pages/:pageNumber/upload-url', filesController.getPageUploadUrl.bind(filesController));
router.post('/:id/confirm', filesController.confirmUpload.bind(filesController));

// Stats
router.get('/stats/:projectId', filesController.getProjectStats.bind(filesController));

export default router;
