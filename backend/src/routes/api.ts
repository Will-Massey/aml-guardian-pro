import { Router } from 'express';
import { body, header } from 'express-validator';
import * as apiController from '../controllers/apiController';
import { handleValidationErrors } from '../middleware/validation';
import { authenticateApiKey } from '../middleware/apiAuth';

const router = Router();

// API Key authentication for all routes
router.use(authenticateApiKey);

// Validation rules
const createClientValidation = [
  body('companyName').trim().isLength({ min: 2 }).withMessage('Company name required'),
  body('companyNumber').optional().trim(),
  body('email').optional().isEmail().withMessage('Valid email required'),
  body('riskLevel').optional().isIn(['LOW', 'MEDIUM', 'HIGH']),
  handleValidationErrors,
];

const webhookValidation = [
  body('url').isURL().withMessage('Valid URL required'),
  body('events').isArray({ min: 1 }).withMessage('At least one event required'),
  handleValidationErrors,
];

// === CLIENT API ===
// Create client from external system
router.post('/clients', createClientValidation, apiController.createClient);

// Get client by company number
router.get('/clients/lookup/:companyNumber', apiController.getClientByCompanyNumber);

// Get all clients with filters
router.get('/clients', apiController.getClients);

// Get single client
router.get('/clients/:id', apiController.getClient);

// Update client
router.put('/clients/:id', apiController.updateClient);

// === DOCUMENT API ===
// Upload document
router.post('/clients/:id/documents', apiController.uploadDocument);

// Get client documents
router.get('/clients/:id/documents', apiController.getClientDocuments);

// === RISK ASSESSMENT API ===
// Trigger risk assessment
router.post('/clients/:id/risk-assessment', apiController.triggerRiskAssessment);

// Get risk assessment
router.get('/clients/:id/risk-assessment', apiController.getRiskAssessment);

// === SCREENING API ===
// Screen a name
router.post('/screen', apiController.screenName);

// Screen a client
router.post('/clients/:id/screen', apiController.screenClient);

// === COMPLIANCE STATUS API ===
// Get compliance status for a client
router.get('/clients/:id/compliance-status', apiController.getComplianceStatus);

// Get firm-wide compliance summary
router.get('/compliance/summary', apiController.getComplianceSummary);

// === WEBHOOK API ===
// Register webhook
router.post('/webhooks', webhookValidation, apiController.registerWebhook);

// List webhooks
router.get('/webhooks', apiController.getWebhooks);

// Delete webhook
router.delete('/webhooks/:id', apiController.deleteWebhook);

// === API KEY MANAGEMENT ===
// Generate new API key
router.post('/keys', apiController.generateApiKey);

// List API keys
router.get('/keys', apiController.getApiKeys);

// Revoke API key
router.delete('/keys/:id', apiController.revokeApiKey);

export default router;
