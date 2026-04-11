// User Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  firmName: string;
  role: UserRole;
  firmAddress?: string;
  firmPhone?: string;
  firmEmail?: string;
  lastLoginAt?: string;
  createdAt: string;
}

export type UserRole = 'ADMIN' | 'MLRO' | 'ACCOUNTANT' | 'VIEWER';

// Auth Types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  firmName: string;
}

// Client Types
export interface Client {
  id: string;
  companyName: string;
  companyNumber?: string;
  companyStatus?: CompanyStatus;
  companyType?: string;
  incorporationDate?: string;
  registeredAddress?: Address;
  sicCodes: string[];
  businessDescription?: string;
  officers?: Officer[];
  pscs?: PSC[];
  riskLevel: RiskLevel;
  riskAssessment?: RiskAssessment;
  cddType: CddType;
  cddCompletedAt?: string;
  cddExpiryDate?: string;
  sourceOfFunds?: string;
  sourceOfWealth?: string;
  expectedTransactions?: string;
  identityVerified: boolean;
  addressVerified: boolean;
  pepScreened: boolean;
  sanctionsScreened: boolean;
  nextReviewDate?: string;
  monitoringNotes?: string;
  documents?: Document[];
  createdAt: string;
  updatedAt: string;
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

export type CompanyStatus = 
  | 'ACTIVE' 
  | 'DISSOLVED' 
  | 'LIQUIDATION' 
  | 'RECEIVERSHIP' 
  | 'ADMINISTRATION' 
  | 'VOLUNTARY_ARRANGEMENT' 
  | 'CONVERTED_CLOSED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type CddType = 'SIMPLIFIED' | 'STANDARD' | 'ENHANCED';

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
  aiGeneratedAt: string;
  aiModel?: string;
  manualOverride: boolean;
  manualRiskLevel?: RiskLevel;
  overrideReason?: string;
  overriddenBy?: string;
  overriddenAt?: string;
  riskJustification?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RiskFactorDetail {
  category: string;
  risk: RiskFactor;
  description: string;
  mitigation?: string;
}

export type RiskFactor = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

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
  status: DocumentStatus;
  clientId: string;
  client?: {
    companyName: string;
    companyNumber?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type DocumentType = 
  | 'RISK_ASSESSMENT'
  | 'AML_POLICY_ACKNOWLEDGEMENT'
  | 'ID_VERIFICATION'
  | 'ADDRESS_VERIFICATION'
  | 'SOURCE_OF_FUNDS'
  | 'SOURCE_OF_WEALTH'
  | 'PEP_SCREENING'
  | 'SANCTIONS_SCREENING'
  | 'ONGOING_MONITORING_PLAN'
  | 'CUSTOMER_DUE_DILIGENCE'
  | 'ENGAGEMENT_LETTER'
  | 'OTHER';

export type DocumentStatus = 'DRAFT' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED' | 'PENDING_SIGNATURE' | 'SIGNED' | 'EXPIRED' | 'SUPERSEDED';

// Companies House Types
export interface CHSearchResult {
  companyNumber: string;
  companyName: string;
  companyStatus?: string;
  companyType?: string;
  dateOfCreation?: string;
  address: Address | null;
}

export interface CHCompanyProfile {
  company: {
    companyNumber: string;
    companyName: string;
    companyStatus: string;
    companyType: string;
    dateOfCreation: string;
    registeredOfficeAddress: Address;
    sicCodes: string[];
    sicDescriptions: { code: string; description: string }[];
  };
  officers: Officer[];
  pscs: PSC[];
}

// Stats Types
export interface ClientStats {
  totalClients: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  recentClients: number;
  complianceRate: number;
}

export interface DocumentStats {
  totalDocuments: number;
  recentDocuments: number;
  documentsByType: { type: DocumentType; count: number }[];
}

// Audit Types
export interface AuditLog {
  id: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  description?: string;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export type AuditAction = 
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VIEW'
  | 'GENERATE'
  | 'EXPORT'
  | 'LOGIN'
  | 'LOGOUT'
  | 'APPROVE'
  | 'REJECT'
  | 'UPLOAD'
  | 'DOWNLOAD';

export interface AuditStats {
  totalActions: number;
  recentActions: number;
  actionsByType: { action: AuditAction; count: number }[];
  recentLogs: AuditLog[];
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  meta?: {
    timestamp: string;
    count?: number;
  };
}
