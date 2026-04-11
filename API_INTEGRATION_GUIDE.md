# AML Guardian Pro - API Integration Guide

## Overview

AML Guardian Pro now offers a comprehensive REST API for integration with Capstone's ecosystem, including proposal software and accountancy practice management systems.

## Base URL

```
Production: https://api.amlguardian.pro/api/v1
Development: http://localhost:3001/api/v1
```

## Authentication

All API requests require an API key passed in the header:

```http
X-API-Key: aml_your_api_key_here
```

### Generate API Key

1. Log into AML Guardian Pro
2. Go to Settings → API Keys
3. Click "Generate New Key"
4. Store the key securely (shown only once)

## Core API Endpoints

### Clients

#### Create Client
```http
POST /clients
Content-Type: application/json
X-API-Key: your_api_key

{
  "companyName": "Acme Limited",
  "companyNumber": "12345678",
  "email": "director@acme.com",
  "riskLevel": "MEDIUM"
}
```

#### Get Client by Company Number
```http
GET /clients/lookup/12345678
X-API-Key: your_api_key
```

#### List All Clients
```http
GET /clients?riskLevel=HIGH&limit=50&offset=0
X-API-Key: your_api_key
```

### Risk Assessment

#### Trigger AI Risk Assessment
```http
POST /clients/{id}/risk-assessment
X-API-Key: your_api_key
```

#### Get Risk Assessment
```http
GET /clients/{id}/risk-assessment
X-API-Key: your_api_key
```

### PEP & Sanctions Screening

#### Screen Any Name
```http
POST /screen
Content-Type: application/json
X-API-Key: your_api_key

{
  "name": "John Smith",
  "birthYear": 1980,
  "country": "United Kingdom"
}
```

#### Screen Client
```http
POST /clients/{id}/screen
X-API-Key: your_api_key
```

### Compliance Status

#### Get Client Compliance Status
```http
GET /clients/{id}/compliance-status
X-API-Key: your_api_key
```

Response:
```json
{
  "success": true,
  "data": {
    "clientId": "uuid",
    "companyName": "Acme Limited",
    "overallStatus": "COMPLIANT",
    "checks": {
      "identityVerified": true,
      "addressVerified": true,
      "pepScreened": true,
      "sanctionsScreened": true,
      "riskAssessment": true,
      "documents": {
        "total": 5,
        "verified": 5
      }
    },
    "nextReviewDate": "2025-04-10"
  }
}
```

#### Get Firm Compliance Summary
```http
GET /compliance/summary
X-API-Key: your_api_key
```

Response:
```json
{
  "success": true,
  "data": {
    "totalClients": 150,
    "compliantClients": 142,
    "complianceRate": 95,
    "pendingDocuments": 8,
    "upcomingReviews": 12,
    "riskDistribution": {
      "low": 90,
      "medium": 45,
      "high": 15
    }
  }
}
```

## Webhooks

### Register Webhook

```http
POST /webhooks
Content-Type: application/json
X-API-Key: your_api_key

{
  "url": "https://your-app.com/webhook/aml",
  "events": [
    "client.created",
    "client.updated",
    "risk-assessment.completed",
    "document.verified"
  ]
}
```

### Available Events

- `client.created` - New client added
- `client.updated` - Client details updated
- `risk-assessment.completed` - AI risk assessment finished
- `document.verified` - Document verified
- `screening.match` - PEP/Sanctions match found

### Webhook Payload

```json
{
  "event": "client.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "id": "uuid",
    "companyName": "Acme Limited",
    "riskLevel": "MEDIUM"
  }
}
```

## Integration Examples

### Practice Management Software

Sync client onboarding:

```javascript
// When new client created in practice management
const createAMLClient = async (clientData) => {
  const response = await fetch('https://api.amlguardian.pro/api/v1/clients', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.AML_API_KEY
    },
    body: JSON.stringify({
      companyName: clientData.companyName,
      companyNumber: clientData.registrationNumber,
      email: clientData.email
    })
  });
  
  const result = await response.json();
  
  // Trigger risk assessment
  await fetch(`https://api.amlguardian.pro/api/v1/clients/${result.data.id}/risk-assessment`, {
    method: 'POST',
    headers: { 'X-API-Key': process.env.AML_API_KEY }
  });
  
  return result.data;
};
```

### Proposal Software

Check compliance before sending proposal:

```javascript
const checkCompliance = async (companyNumber) => {
  const response = await fetch(
    `https://api.amlguardian.pro/api/v1/clients/lookup/${companyNumber}/compliance-status`,
    {
      headers: { 'X-API-Key': process.env.AML_API_KEY }
    }
  );
  
  const result = await response.json();
  
  // Only proceed if compliant
  if (result.data.overallStatus === 'COMPLIANT') {
    return { canProceed: true };
  }
  
  return {
    canProceed: false,
    missing: Object.entries(result.data.checks)
      .filter(([key, value]) => !value)
      .map(([key]) => key)
  };
};
```

## Rate Limits

- 1000 requests per hour per API key
- 100 webhook deliveries per hour

## Error Codes

| Code | Description |
|------|-------------|
| `MISSING_API_KEY` | No API key provided |
| `INVALID_API_KEY` | API key not found |
| `REVOKED_API_KEY` | API key has been revoked |
| `EXPIRED_API_KEY` | API key has expired |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `NOT_FOUND` | Resource not found |

## Support

For API support, contact: api-support@amlguardian.pro
