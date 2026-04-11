# AML Guardian Pro - Agent Guide

## Project Overview

AML Guardian Pro is a comprehensive Anti-Money Laundering (AML) compliance platform designed for UK accountancy firms. The project automates client onboarding, risk assessment, and compliance documentation through:

**GitHub Repository:** https://github.com/Will-Massey/aml-guardian-pro

**Live Deployment:** Railway + Neon (auto-deploy from GitHub)

- **Companies House API Integration** - Auto-populate client data using UK company numbers
- **AI-Powered Risk Assessment** - Intelligent analysis using UK AML regulations (via Anthropic Claude)
- **Automated PDF Generation** - Complete AML documentation packages using Puppeteer
- **Compliance Dashboard** - Track clients and their risk levels
- **Secure Authentication** - JWT-based auth with role-based access control
- **Client Portal** - Secure document upload and communication channel for clients

The project helps accountants comply with:
- Money Laundering, Terrorist Financing and Transfer of Funds Regulations 2017
- 5th Money Laundering Directive (5MLD)
- HMRC AML Supervision Requirements

## Project Structure

The project is organized as a monorepo with three main components:

```
aml-guardian-pro/
├── .github/
│   └── workflows/        # GitHub Actions for CI/CD
│       ├── deploy.yml        # CI pipeline
│       └── pr-preview.yml    # PR build checks
├── backend/              # Node.js/Express API
│   ├── src/
│   │   ├── config/       # Database and app configuration
│   │   ├── controllers/  # API controllers (auth, clients, documents, risk)
│   │   ├── middleware/   # Auth, validation, error handling
│   │   ├── routes/       # API route definitions
│   │   ├── services/     # Business logic
│   │   │   ├── ai/           # AI risk assessment service
│   │   │   ├── analytics/    # Reporting and analytics
│   │   │   ├── audit/        # Audit logging
│   │   │   ├── companiesHouse/  # Companies House API integration
│   │   │   ├── documentProcessor/  # OCR and document processing
│   │   │   ├── email/        # Email notifications
│   │   │   ├── notifications/# Notification service
│   │   │   ├── pdf/          # PDF generation service
│   │   │   └── screening/    # PEP and sanctions screening
│   │   ├── types/        # TypeScript type definitions
│   │   └── utils/        # Utilities (Winston logger)
│   ├── prisma/
│   │   └── schema.prisma # Database schema
│   ├── migrations/       # Prisma migrations
│   ├── .env.example      # Environment variable template
│   ├── .env.production.example  # Production env template
│   ├── Dockerfile
│   └── package.json
├── frontend/             # React SPA
│   ├── src/
│   │   ├── components/   # Reusable React components
│   │   │   ├── AIChat.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── RiskBadge.tsx
│   │   │   └── StatsCard.tsx
│   │   ├── pages/        # Page components
│   │   │   ├── ApiKeysPage.tsx
│   │   │   ├── AuditTrailPage.tsx
│   │   │   ├── CalendarPage.tsx
│   │   │   ├── ChatPage.tsx
│   │   │   ├── ClientDetailPage.tsx
│   │   │   ├── ClientPortal.tsx
│   │   │   ├── ClientsPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── DocumentsPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── NewClientPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   └── ReportsPage.tsx
│   │   ├── services/     # API client services
│   │   ├── store/        # Zustand state management (authStore.ts)
│   │   ├── types/        # TypeScript types
│   │   └── utils/        # Utility functions
│   ├── index.html
│   ├── nginx.conf        # Nginx production config
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   ├── Dockerfile
│   └── package.json
├── scripts/              # Deployment scripts
│   └── deploy-render.sh      # Render deployment helper
├── integrations/         # Third-party integrations
│   ├── quickbooks/       # QuickBooks integration
│   └── xero/             # Xero integration
├── docker-compose.yml    # Full stack orchestration
├── render.yaml           # Render Blueprint configuration
├── DEPLOYMENT.md         # Deployment guide
├── package.json          # Root workspace scripts
├── test-quick.sh         # Quick test script
└── README.md
```

## Technology Stack

### Backend (`/aml-guardian-pro/backend/`)
- **Runtime**: Node.js 20 with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 15 with Prisma ORM
- **Authentication**: JWT (jsonwebtoken) with bcrypt password hashing
- **PDF Generation**: Puppeteer
- **External APIs**: Companies House REST API, Anthropic Claude AI (via Kimi/Claurst)
- **Security**: Helmet, CORS, express-rate-limit, express-validator
- **Logging**: Winston
- **Document Processing**: Tesseract.js (OCR), Sharp (image processing)
- **Email**: Nodemailer

### Frontend (`/aml-guardian-pro/frontend/`)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS with @tailwindcss/forms plugin
- **State Management**: Zustand
- **Data Fetching**: React Query (react-query)
- **Routing**: React Router DOM
- **Forms**: React Hook Form
- **Notifications**: React Hot Toast
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **File Upload**: react-dropzone

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Cloud Hosting**: Render (Web Services + Static Sites)
- **Database**: Neon PostgreSQL (serverless) or PostgreSQL 15 (Docker)
- **Web Server**: Render native or Nginx
- **CI/CD**: GitHub Actions + Render auto-deploy

## Database Schema (Prisma)

The database uses PostgreSQL with the following main models:

- **User** - Accountancy firm users with roles (ADMIN, MLRO, ACCOUNTANT, VIEWER)
- **Client** - Company/client data with risk assessment linkage
- **RiskAssessment** - AI-generated risk analysis with manual override capability
- **Document** - Generated compliance documents
- **DocumentRequest** - Client document upload requests
- **AuditLog** - Compliance audit trail
- **CompaniesHouseCache** - Cached Companies House API data
- **ApiKey** - API access keys for integrations
- **Webhook** - Webhook configurations

Key enums:
- `RiskLevel`: LOW, MEDIUM, HIGH
- `RiskFactor`: LOW, MEDIUM, HIGH, CRITICAL
- `CddType`: SIMPLIFIED, STANDARD, ENHANCED
- `DocumentType`: RISK_ASSESSMENT, AML_POLICY_ACKNOWLEDGEMENT, ID_VERIFICATION, etc.
- `DocumentStatus`: DRAFT, PENDING_VERIFICATION, VERIFIED, REJECTED, PENDING_SIGNATURE, SIGNED, EXPIRED, SUPERSEDED
- `UserRole`: ADMIN, MLRO, ACCOUNTANT, VIEWER
- `AuditAction`: CREATE, UPDATE, DELETE, VIEW, GENERATE, EXPORT, LOGIN, LOGOUT, APPROVE, REJECT, UPLOAD, DOWNLOAD

## Build and Development Commands

### Root Level Commands (from `/aml-guardian-pro/`)
```bash
# Install all dependencies
npm run install:all

# Start both backend and frontend in development mode
npm run dev

# Start services individually
npm run dev:backend    # Backend only (tsx watch)
npm run dev:frontend   # Frontend only (Vite dev server)

# Build for production
npm run build          # Build both
npm run build:backend  # Backend only
npm run build:frontend # Frontend only

# Database operations
npm run db:migrate     # Run Prisma migrations
npm run db:studio      # Open Prisma Studio

# Linting
npm run lint           # Lint both
npm run lint:backend   # Backend only
npm run lint:frontend  # Frontend only
```

### Backend Commands (from `/aml-guardian-pro/backend/`)
```bash
npm run dev            # Development with hot reload (tsx watch)
npm run build          # Compile TypeScript
npm run start          # Start production server
npm run db:migrate     # Run migrations
npm run db:generate    # Generate Prisma client
npm run db:studio      # Open Prisma Studio
npm run lint           # ESLint
npm run test           # Run Jest tests
```

### Frontend Commands (from `/aml-guardian-pro/frontend/`)
```bash
npm run dev            # Start Vite dev server (port 3000)
npm run build          # Build for production
npm run preview        # Preview production build
npm run lint           # ESLint
```

### Docker Deployment
```bash
# Start full stack with Docker Compose
docker-compose up -d

# Services will be available at:
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:3001
# - PostgreSQL: localhost:5432
```

### Render + Neon Cloud Deployment (Recommended)
```bash
# Deploy to Render with Neon PostgreSQL
# See aml-guardian-pro/DEPLOYMENT.md for detailed instructions

# Quick start script
cd aml-guardian-pro
npm run deploy

# Or deploy via Render Blueprint:
# 1. Go to https://dashboard.render.com/blueprints
# 2. Connect your GitHub repo
# 3. Render auto-creates services from render.yaml
```

**Required Environment Variables:**
- `DATABASE_URL` - Neon PostgreSQL connection string
- `JWT_SECRET` - Secure random string (32+ chars)
- `COMPANIES_HOUSE_API_KEY` - From developer hub
- `CORS_ORIGINS` - Frontend URL(s)
- `VITE_API_URL` - Backend URL for frontend

### GitHub Auto-Deployment
The project uses Render's native GitHub integration:
- Push to `master` → Auto-deploy to Render
- PR checks run via GitHub Actions
- Render Blueprint (`render.yaml`) configures services automatically

**Current Repository:** https://github.com/Will-Massey/aml-guardian-pro

**Setup Steps:**
1. Go to [Render Dashboard](https://dashboard.render.com/blueprints)
2. Click "New Blueprint Instance"
3. Connect GitHub repo: `Will-Massey/aml-guardian-pro`
4. Set environment variables in Render dashboard
5. Push to `master` triggers auto-deploy

### Testing
```bash
# Run quick test script (requires running services)
./test-quick.sh

# This tests:
# - Backend health endpoint
# - Authentication endpoints
# - Database connectivity
# - Protected endpoint access
```

## Environment Configuration

### Backend Environment Variables (`backend/.env`)
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/aml_guardian"

# Authentication
JWT_SECRET="your-super-secret-key"
JWT_EXPIRES_IN="24h"
BCRYPT_ROUNDS="12"

# Companies House API
COMPANIES_HOUSE_API_KEY="your-api-key"
COMPANIES_HOUSE_BASE_URL="https://api.company-information.service.gov.uk"

# AI Configuration (via Kimi/Claurst)
CLAURST_PROVIDER="anthropic"
CLAURST_MODEL="claude-opus-4"

# Server
PORT=3001
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"

# File Storage
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE="10485760"

# Security
CORS_ORIGINS="http://localhost:3000,http://localhost:5173"
RATE_LIMIT_WINDOW_MS="900000"
RATE_LIMIT_MAX_REQUESTS="100"

# Logging
LOG_LEVEL="info"
LOG_FILE="./logs/app.log"
```

### Frontend Environment Variables (`frontend/.env`)
```env
VITE_API_URL="http://localhost:3001/api"
```

## API Architecture

### Authentication
- JWT-based authentication with Bearer tokens
- Tokens stored in localStorage (frontend)
- Role-based access control middleware
- Rate limiting on auth endpoints (5 attempts per 15 minutes)

### API Routes
All routes prefixed with `/api`:

| Route | Description |
|-------|-------------|
| `/api/auth/*` | Authentication (login, register, profile) |
| `/api/ch/*` | Companies House integration |
| `/api/clients/*` | Client management |
| `/api/risk-assessments/*` | Risk assessment operations |
| `/api/documents/*` | Document generation and management |
| `/api/audit/*` | Audit trail access |
| `/api/reports/*` | Report generation |
| `/api/team/*` | Team management |
| `/api/portal/*` | Client portal endpoints |
| `/api/chat/*` | AI assistant chat |
| `/api/v1/*` | Public API (API key auth) |
| `/api/health` | Health check endpoint |

### Response Format
All API responses follow a standard format:
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  meta?: {
    timestamp: string;
    page?: number;
    limit?: number;
    total?: number;
  };
}
```

## Code Style Guidelines

### TypeScript
- Strict mode enabled in both frontend and backend
- Path aliases: `@/*` maps to `./src/*`
- Prefer interfaces over types for object shapes
- Use enums for fixed sets of values (shared between frontend/backend types)

### Backend Conventions
- Controllers handle HTTP request/response only
- Business logic in services
- Database access via Prisma client
- Error handling through centralized errorHandler middleware
- Logging via Winston logger
- Async/await with proper error handling

### Frontend Conventions
- Functional components with hooks
- Zustand for global state (auth)
- React Query for server state
- React Hook Form for form handling
- TailwindCSS for styling with custom primary color palette
- Components in PascalCase, utilities in camelCase

### File Naming
- Components: `PascalCase.tsx`
- Services/Hooks: `camelCase.ts`
- Types: `index.ts` in `types/` folders
- Pages: `*Page.tsx`

## Testing Strategy

### Backend Testing
- Jest configured for unit testing (minimal tests currently)
- Run with: `npm test` in backend directory

### Frontend Testing
- ESLint for code quality
- TypeScript for type checking
- No unit tests currently configured (can be added with Jest/Vitest)

### Manual Testing
- Development servers with hot reload
- Prisma Studio for database inspection (`npm run db:studio`)
- Quick test script: `./test-quick.sh`

### Required for Production Testing
1. Companies House API connectivity
2. AI service integration (Claurst)
3. PDF generation (Puppeteer/Chromium)
4. Email sending
5. File upload/download

## Security Considerations

### Implemented Security Measures
1. **Authentication**: JWT with secure secrets, bcrypt password hashing (12 rounds)
2. **Authorization**: Role-based access control (RBAC) middleware
3. **Input Validation**: express-validator on all routes
4. **Rate Limiting**: 100 requests per 15 minutes (stricter on auth: 5 per 15 min)
5. **CORS**: Configured for specific origins only
6. **Helmet**: Security headers middleware
7. **SQL Injection Prevention**: Prisma ORM parameterized queries
8. **XSS Protection**: React's built-in escaping
9. **File Uploads**: Size limits (10MB), path validation, mime type checking

### Required for Production
1. **HTTPS**: Must be enabled in production
2. **Environment Variables**: Change default JWT secrets
3. **Companies House API Key**: Required for company lookup features
4. **AI Provider**: Anthropic API key configured via Kimi/Claurst
5. **Email Service**: SMTP configuration for notifications

## Key Services

### AI Risk Assessment (`backend/src/services/ai/index.ts`)
- Analyzes client data against UK AML regulations
- Considers: business sector, geography, structure, transparency, PEP, sanctions
- Generates risk scores (0-100) and levels (LOW/MEDIUM/HIGH)
- Provides document checklists and ongoing monitoring requirements
- Falls back to rule-based assessment if AI service unavailable

### Companies House Integration (`backend/src/services/companiesHouse/index.ts`)
- Searches companies by name/number
- Retrieves company profiles, officers, and PSCs
- Maps CH API data to internal types
- Includes comprehensive SIC code descriptions
- Caches data to reduce API calls

### PDF Generation (`backend/src/services/pdf/index.ts`)
- Uses Puppeteer to generate PDFs from HTML templates
- Document types: Risk Assessment, CDD, AML Policy, Ongoing Monitoring
- Professional styling with Tailwind-like CSS
- Generates complete AML compliance packages

### Document Processing (`backend/src/services/documentProcessor/`)
- OCR capabilities using Tesseract.js
- Image processing with Sharp
- Automated document verification

### Notification Service (`backend/src/services/notifications/`)
- Scheduled notification queue
- Email integration via Nodemailer
- In-app notifications

## Deployment Notes

### Render + Neon (Recommended for Production)
The project is configured for deployment to Render with Neon PostgreSQL.

**Configuration Files:**
- `render.yaml` - Render Blueprint (configures both services)
- `backend/` - Web Service configuration
- `frontend/` - Static Site configuration
- `.github/workflows/deploy.yml` - CI pipeline

**Deployment Process:**
1. Push code to GitHub (https://github.com/Will-Massey/aml-guardian-pro)
2. Render auto-detects changes via webhook
3. Builds and deploys both services
4. Runs migrations automatically

**Services Created:**
- `aml-guardian-backend` - Node.js Web Service
- `aml-guardian-frontend` - Static Site (React build)

**Required Secrets:**
- `DATABASE_URL` - Neon connection string
- `JWT_SECRET` - Generate with `openssl rand -base64 32`
- `COMPANIES_HOUSE_API_KEY` - From Companies House developer hub
- `CORS_ORIGINS` - Frontend URL(s)
- `VITE_API_URL` - Backend URL for frontend

**Quick Deploy:**
```bash
# Go to Render Blueprints and connect your repo
open https://dashboard.render.com/blueprints
```

**See Also:**
- `DEPLOYMENT.md` - Detailed deployment guide

### Docker Production Build
1. Backend uses Node.js 20-alpine
2. Frontend uses multi-stage build with Nginx
3. PostgreSQL data persisted in Docker volume
4. Uploads directory mounted as volume

### Manual Deployment
1. Build backend: `cd backend && npm run build`
2. Build frontend: `cd frontend && npm run build`
3. Run migrations: `cd backend && npx prisma migrate deploy`
4. Start backend: `cd backend && npm start`
5. Serve frontend build via Nginx or similar

### Production Checklist
- [ ] Change JWT_SECRET from default
- [ ] Set NODE_ENV=production
- [ ] Configure production database URL (Neon/Railway)
- [ ] Set up Companies House API key
- [ ] Configure AI provider credentials
- [ ] Set up SMTP for email notifications
- [ ] Enable HTTPS (Railway provides this automatically)
- [ ] Configure CORS for production domain
- [ ] Set up log rotation
- [ ] Configure backup strategy for database and uploads
- [ ] Set up monitoring and alerts (Railway has built-in metrics)

## Common Development Tasks

### Adding a New API Endpoint
1. Define types in `backend/src/types/index.ts`
2. Create/update controller in `backend/src/controllers/`
3. Add route in `backend/src/routes/`
4. Export from `backend/src/routes/index.ts`
5. Create frontend service in `frontend/src/services/`

### Database Schema Changes
1. Update `backend/prisma/schema.prisma`
2. Run `npm run db:migrate` to create migration
3. Run `npm run db:generate` to update client
4. Update types in both frontend and backend

### Adding a New Page
1. Create page component in `frontend/src/pages/`
2. Add route in `frontend/src/App.tsx`
3. Add link in Layout component if needed

## External Dependencies & APIs

### Required API Keys
1. **Companies House API Key**: Register at https://developer.company-information.service.gov.uk/
2. **Anthropic API**: Configured via Kimi/Claurst for AI risk assessment

### Third-Party Services
- Companies House (UK government API)
- Anthropic Claude (AI risk analysis)
- Optional: QuickBooks, Xero (accounting integrations)

## Troubleshooting

### Common Issues
- **Database connection errors**: Check DATABASE_URL format and PostgreSQL running
- **Prisma client errors**: Run `npm run db:generate`
- **Companies House API errors**: Verify API key in environment
- **CORS errors**: Check CORS_ORIGINS includes frontend URL
- **PDF generation fails**: Ensure Puppeteer dependencies installed (Chromium)
- **File upload fails**: Check UPLOAD_DIR exists and is writable

### Debug Mode
Set `LOG_LEVEL=debug` in backend `.env` for verbose logging.

---

**Note**: This is a compliance tool for UK accountancy firms. It does not constitute legal advice. Users are responsible for ensuring their compliance programs meet all regulatory requirements.
