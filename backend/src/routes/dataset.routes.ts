import { Router } from 'express';
import { DatasetController } from '../controllers/dataset.controller.js';
import { datasetUpload } from '../security/file-upload.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Secure file upload endpoint: passes through authenticate middleware & file size/mime validators
router.post(
  '/upload',
  authenticate,
  datasetUpload.single('file'),
  DatasetController.uploadAndInspect
);

export default router;
