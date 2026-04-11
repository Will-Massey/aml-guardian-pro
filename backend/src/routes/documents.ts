import { Router } from 'express';
import { body, param } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import * as documentController from '../controllers/documentController';
import { handleValidationErrors } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { config } from '../config';
import { logger } from '../utils/logger';

const router = Router();

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await fs.access(config.uploadDir);
  } catch {
    await fs.mkdir(config.uploadDir, { recursive: true });
  }
}
ensureUploadDir();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const userId = req.user?.userId;
    if (!userId) {
      return cb(new Error('Unauthorized'), '');
    }
    const userDir = path.join(config.uploadDir, userId);
    try {
      await fs.access(userDir);
    } catch {
      await fs.mkdir(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, `${timestamp}_${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxFileSize },
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, JPEG, PNG, DOC, DOCX'));
    }
  },
});

// All routes require authentication
router.use(authenticateToken);

// Validation rules
const generateValidation = [
  body('clientId').isUUID().withMessage('Valid client ID required'),
  body('type').isIn([
    'RISK_ASSESSMENT',
    'AML_POLICY_ACKNOWLEDGEMENT',
    'ID_VERIFICATION',
    'ADDRESS_VERIFICATION',
    'SOURCE_OF_FUNDS',
    'SOURCE_OF_WEALTH',
    'PEP_SCREENING',
    'SANCTIONS_SCREENING',
    'ONGOING_MONITORING_PLAN',
    'CUSTOMER_DUE_DILIGENCE',
    'ENGAGEMENT_LETTER',
    'OTHER',
  ]).withMessage('Valid document type required'),
  body('name').optional().trim(),
  handleValidationErrors,
];

const packageValidation = [
  body('clientId').isUUID().withMessage('Valid client ID required'),
  handleValidationErrors,
];

const verifyValidation = [
  body('status').isIn(['DRAFT', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'EXPIRED']).withMessage('Valid status required'),
  body('notes').optional().trim(),
  handleValidationErrors,
];

// Routes
router.get('/', documentController.getDocuments);
router.get('/stats', documentController.getDocumentStats);
router.post('/generate', generateValidation, documentController.generateDocument);
router.post('/generate-package', packageValidation, documentController.generateAMLPackage);
router.post('/upload', upload.single('file'), documentController.uploadDocument);
router.post('/:id/process', param('id').isUUID().withMessage('Valid document ID required'), handleValidationErrors, documentController.processDocumentWithOCR);
router.put('/:id/verify', param('id').isUUID().withMessage('Valid document ID required'), verifyValidation, documentController.verifyDocument);
router.get('/:id/download', param('id').isUUID().withMessage('Valid document ID required'), handleValidationErrors, documentController.downloadDocument);
router.delete('/:id', param('id').isUUID().withMessage('Valid document ID required'), handleValidationErrors, documentController.deleteDocument);

export default router;
