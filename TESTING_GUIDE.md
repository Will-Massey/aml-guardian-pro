# AML Guardian Pro - Complete Testing Guide

## Overview

This guide covers all testing scenarios for AML Guardian Pro, from basic functionality to advanced integrations.

---

## 📋 Pre-Testing Checklist

### Environment Setup

```bash
# 1. Verify services are running
curl http://localhost:3001/health    # Backend
curl http://localhost:3000           # Frontend

# 2. Check database connection
psql -U postgres -d aml_guardian -c "SELECT COUNT(*) FROM users;"

# 3. Verify environment variables
cat backend/.env | grep -E "(DATABASE_URL|JWT_SECRET|ANTHROPIC_API_KEY)"
```

### Required API Keys for Full Testing

| Service | Key Name | Required For | Get From |
|---------|----------|--------------|----------|
| Anthropic Claude | `ANTHROPIC_API_KEY` | AI Risk Assessment | console.anthropic.com |
| Companies House | `COMPANIES_HOUSE_API_KEY` | Company Lookup | developer.company-information.service.gov.uk |
| Sanctions.io | `SANCTIONS_API_KEY` | PEP/Sanctions Screening | sanctions.io |
| Xero | `XERO_CLIENT_ID/SECRET` | Xero Integration | developer.xero.com |
| QuickBooks | `QUICKBOOKS_CLIENT_ID/SECRET` | QB Integration | developer.intuit.com |
| SMTP | `SMTP_HOST/USER/PASS` | Email Notifications | Your email provider |

---

## 🧪 Testing Scenarios

### Phase 1: Core Foundation Tests

#### 1.1 Authentication
```
✅ User Registration
   - POST /api/auth/register
   - Test with valid/invalid data
   - Check email validation
   - Verify password strength requirements

✅ User Login
   - POST /api/auth/login
   - Test correct credentials
   - Test wrong password (error handling)
   - Test JWT token generation
   - Verify token expiration

✅ Password Reset (if implemented)
   - Request reset link
   - Use reset link
   - Verify new password works
```

**Test Script:**
```bash
# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","firstName":"Test","lastName":"User","firmName":"Test Firm"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

#### 1.2 Client Management
```
✅ Create Client
   - Via Companies House (company number)
   - Via manual entry
   - Check duplicate handling
   - Verify data validation

✅ Read Client
   - Get single client
   - List all clients with filters
   - Search functionality
   - Pagination

✅ Update Client
   - Update basic info
   - Update risk level
   - Update verification status
   - Check audit trail

✅ Delete Client
   - Soft delete (recommended)
   - Check cascade effects on documents
   - Verify audit log entry
```

**Test Companies House Numbers:**
- `09482394` - CAPSTONE ACCOUNTANCY LIMITED (active)
- `00000006` - Should return not found
- `123` - Invalid format test

#### 1.3 Risk Assessment
```
✅ AI Generation
   - Create client with company number
   - Verify AI risk assessment is generated
   - Check risk factors breakdown
   - Verify required documents list
   - Check compliance notes

✅ Manual Override
   - Override AI assessment
   - Add override reason
   - Verify audit trail
   - Check indicator shows override

✅ Regenerate
   - Trigger regeneration
   - Verify new assessment created
   - Check old data preserved
```

**Expected Risk Factors:**
- Business sector risk
- Geographic risk
- Structure risk
- Transparency risk
- PEP risk
- Sanctions risk

#### 1.4 Document Management
```
✅ Upload Document
   - Test all file types (PDF, JPG, PNG)
   - Test size limits (10MB)
   - Test virus scanning (if enabled)
   - Verify metadata stored correctly

✅ Download Document
   - Verify file integrity
   - Check permissions
   - Test audit logging

✅ Verify Document
   - Mark as verified
   - Mark as rejected
   - Check status changes
   - Verify notifications

✅ Delete Document
   - Check file removal
   - Verify database cleanup
   - Test with linked requirements
```

### Phase 2: Integration Platform Tests

#### 2.1 API Key Management
```
✅ Generate API Key
   - Create new key
   - Verify unique key generation
   - Check name validation
   - Test expiration dates

✅ Use API Key
   - Make request with X-API-Key header
   - Test invalid key rejection
   - Test expired key handling
   - Verify rate limiting

✅ Revoke API Key
   - Revoke active key
   - Verify key no longer works
   - Check audit log
```

**Test Commands:**
```bash
# Create API key (authenticated)
curl -X POST http://localhost:3001/api/api-keys \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Integration"}'

# Use API key
curl http://localhost:3001/api/v1/clients \
  -H "X-API-Key: your_api_key_here"
```

#### 2.2 Webhook Testing
```
✅ Register Webhook
   - Create webhook with events
   - Verify URL validation
   - Test event type selection

✅ Trigger Webhook
   - Create client → should trigger
   - Update document → should trigger
   - Verify payload format
   - Check retry logic

✅ Webhook Security
   - Test signature verification
   - Test HTTPS requirement
   - Verify timeout handling
```

**Webhook Testing Tool:**
Use webhook.site or ngrok for testing:
```bash
# Register webhook pointing to test URL
curl -X POST http://localhost:3001/api/webhooks \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://webhook.site/your-unique-id",
    "events": ["client.created", "document.verified"]
  }'
```

### Phase 3: Advanced AI Tests

#### 3.1 OCR Document Processing
```
✅ Passport Processing
   - Upload passport image
   - Verify data extraction:
     - Full name
     - Document number
     - Date of birth
     - Expiry date
     - Nationality
   - Check authenticity score

✅ Driving License Processing
   - Upload license image
   - Verify data extraction:
     - Full name
     - License number
     - Address
     - Expiry date
   - Check authenticity score

✅ Utility Bill Processing
   - Upload bill image
   - Verify extraction:
     - Bill type
     - Address
     - Date
     - Amount
   - Check date validity (within 3 months)
```

**Test Files Needed:**
- Sample passport image (test data only)
- Sample driving license image
- Sample utility bill image

#### 3.2 AI Chat
```
✅ Natural Language Queries
   - "Show me high risk clients"
   - "How many clients need review?"
   - "What documents are pending for ABC Ltd?"
   - "Explain enhanced due diligence"

✅ Context Awareness
   - Follow-up questions
   - Reference previous queries
   - Handle ambiguous queries

✅ Response Quality
   - Check accuracy of data
   - Verify helpfulness of explanations
   - Test error handling for unknown queries
```

### Phase 4: Ecosystem Tests

#### 4.1 Client Portal (Critical)

**Prerequisites:**
- Valid client in database
- Client has `identityVerified: false` or `addressVerified: false`

**Test Steps:**

1. **Generate Portal Link**
   ```
   - Navigate to client detail page
   - Click "Client Portal" button
   - Verify modal opens
   - Copy link to clipboard
   - Verify link format: /portal?token=...
   ```

2. **Access Portal (Incognito Window)**
   ```
   - Open incognito/private browser
   - Paste portal link
   - Verify portal loads
   - Check company name displays
   - Check firm branding shows
   ```

3. **Document Upload**
   ```
   - Drag file to upload area
   - Click upload area and select file
   - Test rejected file types (.exe, .zip)
   - Test oversized file (>10MB)
   - Verify upload progress
   - Check success message
   ```

4. **Status Tracking**
   ```
   - Switch to "Status & History" tab
   - Verify uploaded document appears
   - Check status shows "Pending Review"
   - Verify compliance progress updates
   ```

5. **Admin Verification**
   ```
   - Return to admin dashboard
   - Navigate to client detail page
   - Verify document appears in list
   - Check status is "Pending Verification"
   - Click "Verify" button
   - Confirm status changes to "Verified"
   ```

6. **Portal Updates**
   ```
   - Refresh client portal
   - Verify document status updated
   - Check progress bar increased
   ```

#### 4.2 Xero Integration

**Prerequisites:**
- Xero developer account
- OAuth app registered
- Test organization in Xero

**Test Steps:**

1. **OAuth Flow**
   ```
   - Go to Settings > Integrations
   - Click "Connect Xero"
   - Verify redirect to Xero login
   - Authorize application
   - Verify callback handled correctly
   - Check tokens stored securely
   ```

2. **Contact Sync**
   ```
   - Create contact in Xero
   - Trigger sync or wait for webhook
   - Verify contact appears in AML Guardian
   - Check AI risk assessment runs
   ```

3. **Bidirectional Sync**
   ```
   - Update client in AML Guardian
   - Verify change reflected in Xero
   - Mark client high-risk
   - Verify compliance status updates
   ```

#### 4.3 QuickBooks Integration

**Prerequisites:**
- Intuit developer account
- QB OAuth app registered
- Sandbox company

**Test Steps:**
Similar to Xero tests above.

---

## 🔧 Testing Tools

### 1. API Testing (Postman/Insomnia)

Import this collection structure:
```
AML Guardian Pro
├── Authentication
│   ├── Register
│   ├── Login
│   └── Refresh Token
├── Clients
│   ├── List Clients
│   ├── Get Client
│   ├── Create Client
│   ├── Update Client
│   └── Delete Client
├── Documents
│   ├── Upload
│   ├── Download
│   ├── Verify
│   └── Delete
├── Risk Assessment
│   ├── Generate
│   ├── Override
│   └── Regenerate
├── Integrations
│   ├── Generate API Key
│   ├── List API Keys
│   └── Revoke API Key
└── Portal
    ├── Get Portal Data
    ├── Get Requirements
    └── Upload Document
```

### 2. Automated Testing

**Backend (Jest):**
```bash
cd backend
npm test
```

**Frontend (React Testing Library):**
```bash
cd frontend
npm test
```

**E2E (Playwright):**
```bash
# Install Playwright
npm init playwright@latest

# Create test
cat > tests/portal.spec.js << 'EOF'
import { test, expect } from '@playwright/test';

test('client portal upload flow', async ({ page }) => {
  // Login as accountant
  await page.goto('http://localhost:3000/login');
  await page.fill('[name=email]', 'admin@example.com');
  await page.fill('[name=password]', 'Test1234!');
  await page.click('button[type=submit]');
  
  // Navigate to client
  await page.click('text=Clients');
  await page.click('text=ABC Limited');
  
  // Generate portal link
  await page.click('text=Client Portal');
  const link = await page.inputValue('input[name=portalLink]');
  
  // Open in new context (client)
  const clientContext = await browser.newContext();
  const clientPage = await clientContext.newPage();
  await clientPage.goto(link);
  
  // Upload document
  await clientPage.setInputFiles('input[type=file]', 'test-file.pdf');
  await expect(clientPage.locator('text=Upload successful')).toBeVisible();
});
EOF

npx playwright test
```

### 3. Load Testing

```bash
# Install k6
brew install k6

# Create load test
cat > load-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 0 },
  ],
};

export default function () {
  const res = http.get('http://localhost:3001/api/health');
  check(res, { 'status was 200': (r) => r.status == 200 });
  sleep(1);
}
EOF

k6 run load-test.js
```

---

## 📊 Test Data

### Sample Companies (for CH lookup)
```
09482394 - CAPSTONE ACCOUNTANCY LIMITED (Active)
09902762 - TECH STARTUP LTD (Active)
00000000 - Invalid (Not found)
123 - Invalid format
```

### Test Users
```javascript
// Admin
{
  email: "admin@example.com",
  password: "Test1234!",
  role: "ADMIN"
}

// Accountant
{
  email: "accountant@example.com",
  password: "Test1234!",
  role: "ACCOUNTANT"
}

// MLRO
{
  email: "mlro@example.com",
  password: "Test1234!",
  role: "MLRO"
}
```

### Test Documents
```
samples/
├── passport-sample.jpg (valid passport)
├── license-sample.jpg (valid driving license)
├── utility-bill-sample.pdf (recent bill)
├── expired-bill.pdf (old bill - should fail)
├── wrong-format.exe (should be rejected)
├── oversized.pdf (>10MB - should fail)
└── blurry-document.jpg (low quality - OCR test)
```

---

## ✅ Testing Checklist

### Core Features
- [ ] User registration/login
- [ ] Create client via CH lookup
- [ ] Create client via manual entry
- [ ] AI risk assessment generates
- [ ] Manual override works
- [ ] Document upload (all types)
- [ ] Document verification
- [ ] Audit trail records all actions

### Integrations
- [ ] API key generation/usage
- [ ] Webhook registration/triggering
- [ ] Email notifications sent
- [ ] Calendar reminders created

### AI Features
- [ ] OCR extracts passport data
- [ ] OCR extracts license data
- [ ] OCR extracts utility bill data
- [ ] Authenticity check runs
- [ ] AI chat responds accurately
- [ ] Predictive analytics show

### Ecosystem
- [ ] Portal link generation
- [ ] Portal access without login
- [ ] Document upload via portal
- [ ] Portal status tracking
- [ ] Admin sees portal uploads
- [ ] Xero OAuth (if credentials available)
- [ ] QuickBooks OAuth (if credentials available)

### Security
- [ ] JWT token expiration
- [ ] API key validation
- [ ] Rate limiting works
- [ ] File upload restrictions
- [ ] Portal token expiration
- [ ] Audit logs capture everything

### Performance
- [ ] Page loads < 2 seconds
- [ ] CH lookup < 3 seconds
- [ ] AI assessment < 10 seconds
- [ ] Document upload < 5 seconds
- [ ] Database queries optimized

---

## 🐛 Common Issues & Fixes

### Issue: "Invalid token" on portal
**Fix:** Check token hasn't expired; generate new link

### Issue: "Failed to upload document"
**Fix:** Check file size < 10MB; check file type is allowed

### Issue: "AI assessment not generating"
**Fix:** Verify `ANTHROPIC_API_KEY` is set and valid

### Issue: "CH lookup fails"
**Fix:** Check `COMPANIES_HOUSE_API_KEY`; verify company number format

### Issue: "Email not sending"
**Fix:** Verify SMTP settings; check spam folders

### Issue: "OAuth callback fails"
**Fix:** Ensure redirect URI matches exactly in OAuth app settings

---

## 📈 Success Criteria

All tests should pass with:
- ✅ 100% of core features working
- ✅ < 2 second page load times
- ✅ Zero security vulnerabilities
- ✅ 99%+ API uptime
- ✅ All integrations functional

---

**Ready to test! Start with Phase 1 and work through systematically.**
