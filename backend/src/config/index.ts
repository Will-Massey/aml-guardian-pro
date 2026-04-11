import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/aml_guardian',

  // Authentication
  jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),

  // Companies House API
  companiesHouse: {
    apiKey: process.env.COMPANIES_HOUSE_API_KEY || '',
    baseUrl: process.env.COMPANIES_HOUSE_BASE_URL || 'https://api.company-information.service.gov.uk',
  },

  // AI Configuration
  ai: {
    provider: process.env.CLAURST_PROVIDER || 'anthropic',
    model: process.env.CLAURST_MODEL || 'claude-opus-4',
  },

  // File Storage
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),

  // Security
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  logFile: process.env.LOG_FILE || './logs/app.log',
};

// Validation
export function validateConfig(): void {
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'COMPANIES_HOUSE_API_KEY',
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
    console.warn('   Using default values - NOT RECOMMENDED FOR PRODUCTION');
  }

  if (config.jwtSecret === 'default-secret-change-in-production') {
    console.warn('⚠️  Using default JWT secret - CHANGE FOR PRODUCTION!');
  }
}
