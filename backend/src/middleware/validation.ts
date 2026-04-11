import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

/**
 * Middleware to handle validation errors
 */
export function handleValidationErrors(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorDetails: Record<string, string[]> = {};
    
    errors.array().forEach(error => {
      if ('param' in error) {
        const field = String(error.param);
        if (!errorDetails[field]) {
          errorDetails[field] = [];
        }
        errorDetails[field].push(error.msg);
      }
    });

    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errorDetails,
      },
    });
    return;
  }

  next();
}

/**
 * Common validation rules
 */
export const validationRules = {
  // Auth validations
  register: [
    { field: 'email', rules: ['required', 'email'] },
    { field: 'password', rules: ['required', 'min:8'] },
    { field: 'firstName', rules: ['required', 'min:2'] },
    { field: 'lastName', rules: ['required', 'min:2'] },
    { field: 'firmName', rules: ['required', 'min:2'] },
  ],
  
  login: [
    { field: 'email', rules: ['required', 'email'] },
    { field: 'password', rules: ['required'] },
  ],

  // Client validations
  createClient: [
    { field: 'companyName', rules: ['required', 'min:2'] },
    { field: 'companyNumber', rules: ['optional'] },
    { field: 'businessDescription', rules: ['optional'] },
  ],

  // Risk assessment validations
  createRiskAssessment: [
    { field: 'clientId', rules: ['required'] },
  ],

  // Document validations
  generateDocument: [
    { field: 'clientId', rules: ['required'] },
    { field: 'type', rules: ['required'] },
  ],
};

/**
 * Sanitize string input
 */
export function sanitizeString(str: string): string {
  return str.trim().replace(/[<>]/g, '');
}
