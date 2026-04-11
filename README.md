# AML Guardian Pro

A comprehensive Anti-Money Laundering (AML) compliance platform for UK accountants that maximizes automation through Companies House API integration and AI-powered risk assessment, generating bespoke PDF compliance documentation with minimal user input.

## 🚀 Features

### Core Capabilities

- **🏢 Companies House Integration** - Auto-populate client data with a single company number
- **🤖 AI-Powered Risk Assessment** - Intelligent analysis using UK AML regulations
- **📄 Automated PDF Generation** - Complete AML documentation packages
- **📊 Compliance Dashboard** - Track all clients and their risk levels
- **🔐 Secure Authentication** - JWT-based auth with role-based access

### Compliance Features

- **Customer Due Diligence (CDD)** - Standard, Simplified, and Enhanced
- **Risk-Based Assessment** - Automatic risk scoring across multiple factors
- **Beneficial Ownership** - PSC tracking and verification
- **PEP & Sanctions Screening** - Integration points for screening services
- **Ongoing Monitoring** - Scheduled reviews and trigger-based alerts
- **Document Management** - Versioned compliance documents

## 🏗️ Architecture

### Tech Stack

**Backend:**
- Node.js + Express + TypeScript
- PostgreSQL + Prisma ORM
- Puppeteer for PDF generation
- Companies House REST API
- AI Integration (Anthropic Claude via Kimi)

**Frontend:**
- React + TypeScript
- TailwindCSS + Headless UI
- Zustand for state management
- React Query for data fetching

### Project Structure

```
aml-guardian-pro/
├── backend/
│   ├── src/
│   │   ├── config/           # Configuration files
│   │   ├── controllers/      # API controllers
│   │   ├── services/         # Business logic
│   │   │   ├── companiesHouse/  # CH API integration
│   │   │   ├── ai/           # AI risk assessment
│   │   │   └── pdf/          # PDF generation
│   │   ├── routes/           # API routes
│   │   ├── middleware/       # Auth, validation
│   │   └── utils/            # Utilities
│   ├── prisma/
│   │   └── schema.prisma     # Database schema
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/            # Page components
│   │   ├── services/         # API clients
│   │   ├── store/            # State management
│   │   └── types/            # TypeScript types
│   └── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Companies House API Key

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-org/aml-guardian-pro.git
cd aml-guardian-pro
```

2. **Set up the backend**
```bash
cd backend
npm install

# Create .env file
cp .env.example .env

# Edit .env with your configuration
# - Database URL
# - JWT Secret
# - Companies House API Key

# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Start development server
npm run dev
```

3. **Set up the frontend**
```bash
cd ../frontend
npm install

# Start development server
npm run dev
```

### Environment Variables

**Backend (.env):**
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/aml_guardian"

# Authentication
JWT_SECRET="your-super-secret-key"
JWT_EXPIRES_IN="24h"

# Companies House API
COMPANIES_HOUSE_API_KEY="your-api-key"
COMPANIES_HOUSE_BASE_URL="https://api.company-information.service.gov.uk"

# Server
PORT=3001
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
```

**Frontend (.env):**
```env
VITE_API_URL="http://localhost:3001/api"
```

## 📖 Usage

### 1. User Registration

1. Navigate to `http://localhost:3000`
2. Register as a new user with your firm details
3. Login to access the dashboard

### 2. Adding a New Client

1. Click "Add New Client" on the dashboard or clients page
2. Search for the company using Companies House
3. Select the company to auto-populate all details
4. Review the information and confirm
5. AI automatically generates the risk assessment

### 3. Reviewing Risk Assessment

1. Navigate to the client detail page
2. Review the AI-generated risk assessment
3. View detailed analysis across all risk factors
4. Override manually if necessary (with justification)
5. Regenerate with updated company information

### 4. Generating Documents

1. On the client detail page, click "Generate AML Package"
2. The system creates a comprehensive PDF including:
   - Risk Assessment Report
   - Customer Due Diligence Record
   - Ongoing Monitoring Plan
   - Declaration forms
3. Download and share with your client

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |

### Companies House Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ch/search?q={query}` | Search companies |
| GET | `/api/ch/company/{number}` | Get company details |
| GET | `/api/ch/company/{number}/officers` | Get officers |
| GET | `/api/ch/company/{number}/psc` | Get PSCs |

### Client Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/clients` | List clients |
| POST | `/api/clients` | Create client |
| GET | `/api/clients/{id}` | Get client |
| PUT | `/api/clients/{id}` | Update client |
| DELETE | `/api/clients/{id}` | Delete client |

### Risk Assessment Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/risk-assessments/{id}` | Get assessment |
| POST | `/api/risk-assessments/{id}/regenerate` | Regenerate with AI |
| POST | `/api/risk-assessments/{id}/override` | Manual override |

### Document Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents` | List documents |
| POST | `/api/documents/generate` | Generate document |
| POST | `/api/documents/generate-package` | Generate AML package |
| GET | `/api/documents/{id}/download` | Download PDF |

## 🔒 Security

- JWT-based authentication with secure HTTP-only cookies
- Password hashing with bcrypt
- Rate limiting on all endpoints
- CORS protection
- Input validation and sanitization
- SQL injection prevention via Prisma ORM
- XSS protection via React

## 📋 Compliance

This software is designed to help UK accountancy firms comply with:

- **Money Laundering, Terrorist Financing and Transfer of Funds (Information on the Payer) Regulations 2017**
- **5th Money Laundering Directive (5MLD)**
- **HMRC AML Supervision Requirements**

### Disclaimer

> This software is a tool to assist with AML compliance. It does not constitute legal advice. Users are responsible for ensuring their compliance programs meet all regulatory requirements. Always consult with a qualified MLRO or legal professional for compliance matters.

## 🛣️ Roadmap

- [ ] ID Verification Integration (Jumio, Onfido)
- [ ] PEP/Sanctions API Integration (ComplyAdvantage)
- [ ] Open Banking for Source of Funds verification
- [ ] Ongoing Monitoring Alerts
- [ ] MLRO Reporting Dashboard
- [ ] Multi-tenancy for Accountancy Firms
- [ ] Mobile Applications

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- UK Companies House for providing the API
- Anthropic for AI capabilities
- The open-source community for the amazing tools

## 📞 Support

For support, please contact support@amlguardian.com or open an issue on GitHub.

---

**Built with ❤️ for the UK Accountancy Industry**
