// Import Prisma types
import { 
  UserRole, 
  RiskLevel, 
  RiskFactor, 
  CddType, 
  CompanyStatus, 
  DocumentType, 
  DocumentStatus 
} from '@prisma/client';

// Re-export Prisma enums
export { UserRole, RiskLevel, RiskFactor, CddType, CompanyStatus, DocumentType, DocumentStatus };

// User Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  firmName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  firmAddress?: string;
  firmPhone?: string;
  firmEmail?: string;
  firmLogoUrl?: string;
}

// Client Types
export interface Client {
  id: string;
  companyName: string;
  companyNumber?: string;
  companyStatus?: CompanyStatus;
  companyType?: string;
  incorporationDate?: Date;
  registeredAddress?: Address;
  sicCodes: string[];
  businessDescription?: string;
  officers?: Officer[];
  pscs?: PSC[];
  
  riskLevel: RiskLevel;
  riskAssessment?: RiskAssessment;
  
  cddType: CddType;
  cddCompletedAt?: Date;
  cddExpiryDate?: Date;
  
  sourceOfFunds?: string;
  sourceOfWealth?: string;
  expectedTransactions?: string;
  
  identityVerified: boolean;
  addressVerified: boolean;
  pepScreened: boolean;
  sanctionsScreened: boolean;
  
  nextReviewDate?: Date;
  monitoringNotes?: string;
  
  userId: string;
  documents: Document[];
  
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface Address {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
}

export interface Officer {
  name: string;
  role: string;
  appointedDate?: string;
  resignedDate?: string;
  dateOfBirth?: {
    month: number;
    year: number;
  };
  nationality?: string;
  occupation?: string;
  address?: Address;
}

export interface PSC {
  name: string;
  natureOfControl: string[];
  notifiedDate?: string;
  ceasedDate?: string;
  dateOfBirth?: {
    month: number;
    year: number;
  };
  nationality?: string;
  address?: Address;
}

// Risk Assessment Types
export interface RiskAssessment {
  id: string;
  overallRiskLevel: RiskLevel;
  riskScore: number;
  
  businessSectorRisk: RiskFactor;
  geographicRisk: RiskFactor;
  structureRisk: RiskFactor;
  transparencyRisk: RiskFactor;
  pepRisk: RiskFactor;
  sanctionsRisk: RiskFactor;
  
  riskFactors: RiskFactorDetail[];
  riskMitigation: string[];
  requiredDocuments: string[];
  ongoingMonitoring: string;
  
  aiAnalysis?: string;
  aiGeneratedAt: Date;
  aiModel?: string;
  
  manualOverride: boolean;
  manualRiskLevel?: RiskLevel;
  overrideReason?: string;
  overriddenBy?: string;
  overriddenAt?: Date;
  
  riskJustification?: string;
  
  client?: Client;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface RiskFactorDetail {
  category: string;
  risk: RiskFactor;
  description: string;
  mitigation?: string;
}

// Document Types
export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  description?: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  templateData?: Record<string, unknown>;
  status: DocumentStatus;
  clientId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Companies House API Types
export interface CHCompany {
  company_number: string;
  company_name: string;
  company_status: string;
  company_type: string;
  date_of_creation: string;
  registered_office_address: CHAddress;
  sic_codes?: string[];
  accounts?: CHAccounts;
  confirmation_statement?: CHConfirmationStatement;
  links?: CHLinks;
}

export interface CHAddress {
  address_line_1?: string;
  address_line_2?: string;
  care_of?: string;
  country?: string;
  locality?: string;
  po_box?: string;
  postal_code?: string;
  region?: string;
}

export interface CHAccounts {
  accounting_reference_date?: {
    day: string;
    month: string;
  };
  last_accounts?: {
    made_up_to: string;
    type: string;
  };
  next_accounts?: {
    due_on: string;
    overdue: boolean;
    period_end_on: string;
    period_start_on: string;
  };
  next_due: string;
  overdue: boolean;
}

export interface CHConfirmationStatement {
  last_made_up_to?: string;
  next_due: string;
  next_made_up_to: string;
  overdue: boolean;
}

export interface CHLinks {
  self: string;
  filing_history?: string;
  officers?: string;
  persons_with_significant_control?: string;
}

export interface CHSearchResult {
  items: CHSearchItem[];
  total_results: number;
  items_per_page: number;
  start_index: number;
  kind: string;
}

export interface CHSearchItem {
  company_number: string;
  company_name: string;
  company_status?: string;
  company_type?: string;
  date_of_creation?: string;
  address?: CHAddress;
  snippet?: string;
}

// API Request/Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  timestamp: string;
}

// Auth Types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  firmName: string;
}
