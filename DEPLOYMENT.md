# AML Guardian Pro - Railway + Neon Deployment Guide

This guide walks you through deploying AML Guardian Pro to **Railway** (hosting) with **Neon** (PostgreSQL database).

> 🚀 **For Automatic GitHub Deployment**, see: [`RAILWAY_GITHUB_AUTO_DEPLOY.md`](./RAILWAY_GITHUB_AUTO_DEPLOY.md)

## Quick Links

| Setup Type | Guide | Time |
|------------|-------|------|
| **Manual Deploy (CLI)** | This guide | 10 min |
| **Automatic GitHub Deploy** | [`RAILWAY_GITHUB_AUTO_DEPLOY.md`](./RAILWAY_GITHUB_AUTO_DEPLOY.md) | 15 min |
| **One-Click Deploy** | Use deploy script (below) | 5 min |

## Prerequisites

- [Railway CLI](https://docs.railway.app/guides/cli) installed (optional but recommended)
- [Neon](https://neon.tech) account
- Companies House API key (get from [developer hub](https://developer.company-information.service.gov.uk/))
- Anthropic API key (for AI risk assessment)

---

## Step 1: Set Up Neon Database

### Create Neon Project

1. Go to [neon.tech](https://neon.tech) and sign up/log in
2. Click **"New Project"**
3. Choose:
   - **Project name**: `aml-guardian-pro`
   - **Region**: Select closest to your users (e.g., `Europe (Frankfurt)` for UK/EU)
   - **PostgreSQL version**: 15 (recommended)
4. Click **"Create Project"**

### Get Connection String

1. In your Neon project dashboard, go to **"Connection Details"**
2. Select **"Node.js"** from the dropdown
3. Copy the connection string (format: `postgresql://user:password@host/database?sslmode=require`)
4. Save this for later - you'll need it in Railway

### Create Database Schema

Neon automatically creates a `neondb` database. You can use this or create a new one:

```sql
-- In Neon SQL Editor, run if you want a dedicated database:
CREATE DATABASE aml_guardian;
```

---

## Step 2: Deploy Backend to Railway

### Option A: Railway CLI (Recommended)

```bash
# Navigate to project
cd aml-guardian-pro/backend

# Login to Railway
railway login

# Create new project (or link to existing)
railway init --name aml-guardian-backend

# Add PostgreSQL variable from Neon
railway variables set DATABASE_URL="postgresql://..."

# Set required environment variables
railway variables set JWT_SECRET="your-super-secure-random-string-min-32-chars"
railway variables set COMPANIES_HOUSE_API_KEY="your-api-key"
railway variables set CLAURST_PROVIDER="anthropic"
railway variables set CLAURST_MODEL="claude-opus-4"

# Deploy
railway up
```

### Option B: Railway Dashboard (UI)

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repository
4. Railway will auto-detect the `railway.toml` configuration
5. Click on the **"Variables"** tab and add:

| Variable | Value | Required |
|----------|-------|----------|
| `DATABASE_URL` | Your Neon connection string | ✅ |
| `JWT_SECRET` | Random string (32+ chars) | ✅ |
| `COMPANIES_HOUSE_API_KEY` | Your Companies House API key | ✅ |
| `CLAURST_PROVIDER` | `anthropic` | ⚠️ (for AI features) |
| `CLAURST_MODEL` | `claude-opus-4` | ⚠️ (for AI features) |
| `CORS_ORIGINS` | Frontend URL (set after deploy) | ⚠️ |

6. Click **"Deploy"**

### Verify Backend Deployment

After deployment:

1. Railway will provide a public URL (e.g., `https://aml-guardian-backend.up.railway.app`)
2. Test the health endpoint:
   ```bash
   curl https://your-backend-url.up.railway.app/api/health
   ```
   Expected response:
   ```json
   {"status":"healthy","timestamp":"...","version":"1.0.0"}
   ```

---

## Step 3: Deploy Frontend to Railway

### Option A: Railway CLI

```bash
# Navigate to frontend
cd aml-guardian-pro/frontend

# Initialize/link project
railway init --name aml-guardian-frontend

# Set API URL (use your backend Railway URL)
railway variables set VITE_API_URL="https://your-backend-url.up.railway.app/api"

# Deploy
railway up
```

### Option B: Railway Dashboard

1. In Railway, click **"New"** → **"Service"**
2. Select **"GitHub Repo"** and choose your repository
3. Configure:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Start Command**: `npx serve -s dist -p $PORT`
4. Add environment variable:
   - `VITE_API_URL`: `https://your-backend-url.up.railway.app/api`
5. Deploy

---

## Step 4: Update CORS (Important!)

After both services are deployed, update the backend CORS:

```bash
# In backend directory
railway variables set CORS_ORIGINS="https://your-frontend-url.up.railway.app"
```

Or via Dashboard:
1. Go to backend service → Variables
2. Add `CORS_ORIGINS` with your frontend URL
3. Redeploy

---

## Environment Variables Reference

### Backend Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://user:pass@host/db?sslmode=require` |
| `JWT_SECRET` | Secret for JWT signing | `min-32-char-random-string` |
| `JWT_EXPIRES_IN` | Token expiration | `24h` |
| `BCRYPT_ROUNDS` | Password hashing rounds | `12` |
| `COMPANIES_HOUSE_API_KEY` | Companies House API key | `your-api-key` |
| `COMPANIES_HOUSE_BASE_URL` | Companies House API URL | `https://api.company-information.service.gov.uk` |
| `CLAURST_PROVIDER` | AI provider | `anthropic` |
| `CLAURST_MODEL` | AI model | `claude-opus-4` |
| `CORS_ORIGINS` | Allowed frontend origins | `https://frontend.up.railway.app` |
| `PORT` | Server port (Railway sets this) | `3000` |
| `NODE_ENV` | Environment | `production` |

### Frontend Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://backend.up.railway.app/api` |

---

## Troubleshooting

### Database Connection Issues

**Error**: `Connection refused` or `timeout`

**Solution**:
1. Ensure Neon connection string includes `?sslmode=require`
2. Check Neon dashboard for active compute (free tier pauses after inactivity)
3. Verify IP allowlist in Neon (should be open to all for Railway)

### Prisma Migration Failures

**Error**: `Migration failed`

**Solution**:
```bash
# Connect to Neon and reset (careful - destroys data!)
npx prisma migrate reset

# Or run specific migration
npx prisma migrate deploy
```

### CORS Errors

**Error**: `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solution**:
1. Verify `CORS_ORIGINS` includes exact frontend URL (no trailing slash)
2. Redeploy backend after CORS update
3. Check browser dev tools for exact error

### File Upload Failures

**Error**: `ENOENT: no such file or directory`

**Solution**:
- Railway filesystem is ephemeral - uploads may not persist between deploys
- Consider using cloud storage (S3, Cloudinary) for production file storage

---

## Useful Commands

```bash
# View logs
railway logs

# View logs (follow)
railway logs -f

# Shell into service
railway connect

# Run database commands
railway run npx prisma studio

# Status
railway status
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Railway                              │
│  ┌─────────────────────┐      ┌─────────────────────────┐  │
│  │   Frontend Service  │      │    Backend Service      │  │
│  │   (Static Site)     │◄────►│    (Node.js API)        │  │
│  │                     │      │                         │  │
│  │  React + Vite       │      │  Express + Prisma       │  │
│  └─────────────────────┘      └─────────────────────────┘  │
│                                          │                  │
│                                          ▼                  │
│                               ┌─────────────────────────┐  │
│                               │   Neon (PostgreSQL)     │  │
│                               │   (External Service)    │  │
│                               └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Post-Deployment Checklist

- [ ] Backend health check responds correctly
- [ ] Frontend loads without errors
- [ ] Can register/login as a new user
- [ ] Can search Companies House for a company
- [ ] Can create a client with risk assessment
- [ ] Can generate PDF documents
- [ ] CORS errors resolved in browser console

---

## Next Steps

1. **Set up custom domain** (optional): Configure in Railway dashboard
2. **Enable email notifications**: Add SMTP configuration
3. **Set up monitoring**: Use Railway's built-in metrics or integrate Datadog
4. **Configure backups**: Neon provides automated backups
5. **Scale**: Upgrade Railway plan for more resources

---

**Support**:
- Railway Docs: https://docs.railway.app
- Neon Docs: https://neon.tech/docs
- Project Issues: Create an issue in your repository
