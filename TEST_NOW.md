# Test AML Guardian Pro Right Now (5-Minute Guide)

## Prerequisites
- [ ] Backend running (`cd backend && npm run dev`)
- [ ] Frontend running (`cd frontend && npm run dev`)
- [ ] Database migrated (`npx prisma migrate dev`)

## Quick Automated Test

```bash
./test-quick.sh
```

This tests all API endpoints and reports status.

---

## Manual Testing (10 Minutes)

### 1. Login Test (1 min)
1. Open http://localhost:3000
2. Login with:
   - Email: `admin@example.com`
   - Password: `Test1234!`
3. ✅ Should see dashboard

### 2. Create Client Test (2 min)
1. Click "Clients" in menu
2. Click "Add Client"
3. Enter company number: `09482394`
4. Click "Look Up"
5. ✅ Should auto-fill company details
6. Save the client

### 3. Risk Assessment Test (2 min)
1. Click on the new client
2. Should see "Risk Assessment" section
3. If it says "Not assessed yet", click "Regenerate"
4. ✅ Should show risk level (LOW/MEDIUM/HIGH)
5. ✅ Should show risk factors breakdown

### 4. Document Upload Test (2 min)
1. On client page, scroll to Documents
2. Click "Upload Document"
3. Select any PDF or image file
4. Set document type to "ID Verification"
5. Click Upload
6. ✅ Document should appear in list
7. Click "Verify" button
8. ✅ Status should change to "Verified"

### 5. Client Portal Test (3 min) ⭐ NEW FEATURE

**Generate Portal Link:**
1. Go to client detail page
2. Click **"Client Portal"** button (top right)
3. ✅ Modal should open with secure link
4. Click "Copy Link"

**Test Portal as Client:**
1. Open incognito/private browser window
2. Paste the copied link
3. ✅ Should see client portal (no login required!)
4. Should show:
   - Client company name
   - Your firm branding
   - Required documents list
   - Upload areas

**Upload via Portal:**
1. Drag a file to upload area (or click to select)
2. ✅ Should upload successfully
3. Switch to "Status & History" tab
4. ✅ Should see uploaded document

**Verify as Accountant:**
1. Return to admin dashboard
2. Refresh the client page
3. ✅ Should see new document in Documents section
4. Status should be "Pending Verification"
5. Click "Verify"
6. ✅ Status changes to "Verified"

### 6. API Test (1 min)

**Generate API Key:**
1. Click "Integrations" in menu
2. Enter name: "Test Integration"
3. Click "Generate API Key"
4. ✅ Should show new API key
5. Copy the key

**Test API:**
```bash
curl http://localhost:3001/api/v1/clients \
  -H "X-API-Key: YOUR_COPIED_KEY"
```
✅ Should return client list

### 7. AI Chat Test (1 min)
1. Click "AI Assistant" in menu
2. Type: "How many high risk clients do I have?"
3. ✅ Should return an answer
4. Try: "Explain enhanced due diligence"
5. ✅ Should provide explanation

---

## Expected Results Summary

| Feature | Expected Result | Status |
|---------|----------------|--------|
| Login | Dashboard loads with stats | ⬜ |
| Create Client | Company data auto-fills from CH | ⬜ |
| Risk Assessment | AI generates risk score | ⬜ |
| Document Upload | File uploads & verifies | ⬜ |
| **Client Portal** | **Link generates, uploads work** | ⬜ |
| API Key | Key generates, API works | ⬜ |
| AI Chat | Responds to queries | ⬜ |

---

## If Something Fails

### "Backend not running"
```bash
cd backend
npm install  # if needed
npm run dev
```

### "Database error"
```bash
cd backend
npx prisma migrate reset --force
npm run seed  # if you have seed data
```

### "Companies House lookup fails"
- Check `COMPANIES_HOUSE_API_KEY` in `.env`
- Get key from: developer.company-information.service.gov.uk

### "AI assessment not generating"
- Check `ANTHROPIC_API_KEY` in `.env`
- Get key from: console.anthropic.com

### "Portal upload fails"
- Check browser console for errors
- Verify file is under 10MB
- Verify file type is PDF, JPG, or PNG

---

## Quick Verification Checklist

After testing, you should have:
- [ ] At least 1 client created
- [ ] 1 risk assessment generated
- [ ] 1 document uploaded and verified
- [ ] 1 portal link generated and tested
- [ ] 1 API key created and tested

---

## All Tests Pass? 🎉

Your AML Guardian Pro is fully operational!

**Ready for:**
- Demo to stakeholders
- Beta testing with friendly firms
- Production deployment planning

---

## Need More Testing?

See `TESTING_GUIDE.md` for comprehensive testing including:
- Webhook testing
- Xero/QuickBooks integration testing
- OCR document processing testing
- Load testing
- Security testing
