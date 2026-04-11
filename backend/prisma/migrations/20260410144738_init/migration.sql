-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MLRO', 'ACCOUNTANT', 'VIEWER');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'DISSOLVED', 'LIQUIDATION', 'RECEIVERSHIP', 'ADMINISTRATION', 'VOLUNTARY_ARRANGEMENT', 'CONVERTED_CLOSED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "RiskFactor" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "CddType" AS ENUM ('SIMPLIFIED', 'STANDARD', 'ENHANCED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('RISK_ASSESSMENT', 'AML_POLICY_ACKNOWLEDGEMENT', 'ID_VERIFICATION', 'ADDRESS_VERIFICATION', 'SOURCE_OF_FUNDS', 'SOURCE_OF_WEALTH', 'PEP_SCREENING', 'SANCTIONS_SCREENING', 'ONGOING_MONITORING_PLAN', 'CUSTOMER_DUE_DILIGENCE', 'ENGAGEMENT_LETTER', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'PENDING_SIGNATURE', 'SIGNED', 'EXPIRED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'GENERATE', 'EXPORT', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT', 'UPLOAD', 'DOWNLOAD');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'FULFILLED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "firmName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ACCOUNTANT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "firmAddress" TEXT,
    "firmPhone" TEXT,
    "firmEmail" TEXT,
    "firmLogoUrl" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyNumber" TEXT,
    "companyStatus" "CompanyStatus",
    "companyType" TEXT,
    "incorporationDate" TIMESTAMP(3),
    "registeredAddress" JSONB,
    "sicCodes" TEXT[],
    "businessDescription" TEXT,
    "officers" JSONB,
    "pscs" JSONB,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "riskAssessmentId" TEXT,
    "cddType" "CddType" NOT NULL DEFAULT 'STANDARD',
    "cddCompletedAt" TIMESTAMP(3),
    "cddExpiryDate" TIMESTAMP(3),
    "sourceOfFunds" TEXT,
    "sourceOfWealth" TEXT,
    "expectedTransactions" TEXT,
    "identityVerified" BOOLEAN NOT NULL DEFAULT false,
    "addressVerified" BOOLEAN NOT NULL DEFAULT false,
    "pepScreened" BOOLEAN NOT NULL DEFAULT false,
    "sanctionsScreened" BOOLEAN NOT NULL DEFAULT false,
    "nextReviewDate" TIMESTAMP(3),
    "monitoringNotes" TEXT,
    "userId" TEXT NOT NULL,
    "portalToken" TEXT,
    "portalTokenExpiry" TIMESTAMP(3),
    "portalEnabled" BOOLEAN NOT NULL DEFAULT false,
    "portalLastAccess" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_assessments" (
    "id" TEXT NOT NULL,
    "overallRiskLevel" "RiskLevel" NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "businessSectorRisk" "RiskFactor" NOT NULL DEFAULT 'MEDIUM',
    "geographicRisk" "RiskFactor" NOT NULL DEFAULT 'MEDIUM',
    "structureRisk" "RiskFactor" NOT NULL DEFAULT 'MEDIUM',
    "transparencyRisk" "RiskFactor" NOT NULL DEFAULT 'MEDIUM',
    "pepRisk" "RiskFactor" NOT NULL DEFAULT 'LOW',
    "sanctionsRisk" "RiskFactor" NOT NULL DEFAULT 'LOW',
    "riskFactors" JSONB NOT NULL,
    "riskMitigation" TEXT[],
    "requiredDocuments" TEXT[],
    "ongoingMonitoring" TEXT NOT NULL,
    "aiAnalysis" TEXT,
    "aiGeneratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aiModel" TEXT,
    "manualOverride" BOOLEAN NOT NULL DEFAULT false,
    "manualRiskLevel" "RiskLevel",
    "overrideReason" TEXT,
    "overriddenBy" TEXT,
    "overriddenAt" TIMESTAMP(3),
    "riskJustification" TEXT,
    "nextReviewDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "description" TEXT,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "templateData" JSONB,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "description" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ch_cache" (
    "id" TEXT NOT NULL,
    "companyNumber" TEXT NOT NULL,
    "companyData" JSONB NOT NULL,
    "officersData" JSONB,
    "pscData" JSONB,
    "filingData" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ch_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT[],
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastTriggeredAt" TIMESTAMP(3),

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_requests" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "acceptedFormats" TEXT[] DEFAULT ARRAY['pdf', 'jpg', 'png']::TEXT[],
    "required" BOOLEAN NOT NULL DEFAULT true,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "clientId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "documentId" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "document_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clients_companyNumber_key" ON "clients"("companyNumber");

-- CreateIndex
CREATE UNIQUE INDEX "clients_riskAssessmentId_key" ON "clients"("riskAssessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "clients_portalToken_key" ON "clients"("portalToken");

-- CreateIndex
CREATE INDEX "clients_portalToken_idx" ON "clients"("portalToken");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ch_cache_companyNumber_key" ON "ch_cache"("companyNumber");

-- CreateIndex
CREATE INDEX "ch_cache_companyNumber_idx" ON "ch_cache"("companyNumber");

-- CreateIndex
CREATE INDEX "ch_cache_expiresAt_idx" ON "ch_cache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_key" ON "api_keys"("key");

-- CreateIndex
CREATE INDEX "api_keys_userId_idx" ON "api_keys"("userId");

-- CreateIndex
CREATE INDEX "api_keys_key_idx" ON "api_keys"("key");

-- CreateIndex
CREATE INDEX "webhooks_userId_idx" ON "webhooks"("userId");

-- CreateIndex
CREATE INDEX "document_requests_clientId_idx" ON "document_requests"("clientId");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_riskAssessmentId_fkey" FOREIGN KEY ("riskAssessmentId") REFERENCES "risk_assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
