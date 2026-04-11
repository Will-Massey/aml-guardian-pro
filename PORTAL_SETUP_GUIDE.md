# Client Portal Quick Setup Guide

## Overview

The Client Portal allows your clients to upload compliance documents securely without creating accounts. This guide will help you set up and test the feature.

## Prerequisites

1. Backend running on port 3001
2. Frontend running on port 3000
3. Database migrated and seeded
4. Valid test client in the system

## Step-by-Step Setup

### 1. Start the Services

```bash
# Terminal 1 - Start Backend
cd backend
npm run dev

# Terminal 2 - Start Frontend
cd frontend
npm run dev
```

### 2. Login to the Application

1. Open http://localhost:3000
2. Login with test account:
   - Email: `admin@example.com`
   - Password: `Test1234!`

### 3. Create a Test Client (if needed)

1. Go to "Clients" menu
2. Click "Add Client"
3. Enter company number (e.g., `09482394`) or manual details
4. Save the client

### 4. Generate Portal Link

1. Go to the client detail page
2. Click the **"Client Portal"** button in the top right
3. A modal will appear with:
   - Secure portal link
   - Expiration date (30 days)
   - "Copy Link" button
   - "Open Email Client" button

### 5. Test the Portal

1. Click "Copy Link"
2. Open an incognito/private browser window
3. Paste the link and navigate
4. You should see:
   - Client company name
   - Your firm name/branding
   - List of required documents
   - Upload areas for each document type

### 6. Upload a Test Document

1. In the portal, click on an upload area or drag a file
2. Select a PDF, JPG, or PNG file (under 10MB)
3. The file should upload and show in "Status & History" tab
4. Check the "Status & History" tab for progress

### 7. Verify in Admin Dashboard

1. Return to the admin dashboard (http://localhost:3000)
2. Go to the same client's detail page
3. The uploaded document should appear in the Documents section
4. Status should be "Pending Verification"

## Expected Portal Experience

### For the Client:
```
┌─────────────────────────────────────────────────────┐
│  🔒 AML Compliance Portal - Secure Connection      │
│                                                      │
│  Welcome, ABC Limited                                │
│                                                      │
│  Please upload the following documents:              │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │ 📄 Identity Verification          [Required] │  │
│  │    Please upload a valid passport...         │  │
│  │    ┌────────────────────────────────────┐    │  │
│  │    │  Click to upload or drag & drop   │    │  │
│  │    │  Accepted: PDF, JPG, PNG          │    │  │
│  │    └────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  Progress: 0% complete                               │
│  [____________________]                              │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### For the Accountant:
```
┌─────────────────────────────────────────────────────┐
│  ABC Limited                        [Client Portal] │
│  09482394 • Private Limited Company                 │
│                                                      │
│  📄 Documents (1)                                   │
│  ┌──────────────────────────────────────────────┐  │
│  │ passport.pdf                     Pending      │  │
│  │ ID Verification • Uploaded 2 min ago         │  │
│  │ [Verify] [Reject] [Download]                 │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Troubleshooting

### Issue: "Invalid or expired link" error
**Solution:** 
- Check that the backend is running
- Verify the token hasn't expired (30 days)
- Generate a new link from the client detail page

### Issue: "Failed to generate portal link"
**Solution:**
- Check browser console for errors
- Verify the client exists in database
- Check backend logs for errors

### Issue: Upload fails
**Solution:**
- Check file is under 10MB
- Verify file type is PDF, JPG, or PNG
- Check backend uploads directory exists
- Check browser console for CORS errors

### Issue: Portal shows no requirements
**Solution:**
- The client's compliance flags are already all true
- Manually set `identityVerified: false` in database to test
- Or create a new client

## Security Notes

1. **Token Security:**
   - Each link is unique and cryptographically random
   - Links expire after 30 days automatically
   - No password required (convenient but secure)

2. **File Uploads:**
   - Files are scanned by type and size
   - Stored in secure directory
   - Accessible only through authenticated endpoints

3. **Best Practices:**
   - Don't share portal links in unsecured channels
   - Revoke access when no longer needed
   - Monitor portal access in audit logs

## Customization

### Change Token Expiry
Edit `backend/src/routes/clients.ts`:
```typescript
const expiryDate = new Date();
expiryDate.setDate(expiryDate.getDate() + 30); // Change 30 to desired days
```

### Change Allowed File Types
Edit `frontend/src/pages/ClientPortal.tsx`:
```typescript
accept: {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  // Add more types here
},
```

### Change File Size Limit
Edit `frontend/src/pages/ClientPortal.tsx`:
```typescript
maxSize: 10 * 1024 * 1024, // Change 10 to desired MB
```

## Next Steps

1. **Email Integration:**
   - Configure SMTP in `.env`
   - Test "Open Email Client" button
   - Consider automating portal invites on client creation

2. **Customization:**
   - Add your firm logo to portal header
   - Customize document requirements per client type
   - Add custom instructions/welcome message

3. **Monitoring:**
   - Track portal usage analytics
   - Monitor upload success rates
   - Set up alerts for failed uploads

## Support

For issues or questions:
1. Check logs: `backend/logs/combined.log`
2. Review browser console for frontend errors
3. Verify database: `npx prisma studio`
4. Contact: support@amlguardian.pro

---

**Ready to streamline your document collection! 🚀**
