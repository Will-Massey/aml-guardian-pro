import { Router } from 'express';
import { query } from 'express-validator';
import * as companiesHouseController from '../controllers/companiesHouseController';
import { handleValidationErrors } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Validation rules
const searchValidation = [
  query('q').trim().notEmpty().withMessage('Search query required'),
  handleValidationErrors,
];

// Routes
router.get('/search', searchValidation, companiesHouseController.searchCompanies);
router.get('/company/:number', companiesHouseController.getCompanyDetails);
router.get('/company/:number/officers', companiesHouseController.getCompanyOfficers);
router.get('/company/:number/psc', companiesHouseController.getCompanyPSCs);
router.get('/company/:number/full', companiesHouseController.getFullCompanyProfile);

export default router;
