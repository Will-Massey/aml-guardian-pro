# AML Guardian Pro - Render + Neon Deployment Guide

This guide walks you through deploying AML Guardian Pro to **Render** (hosting) with **Neon** (PostgreSQL database).

---

## Quick Links

| Setup Type | Time | Difficulty |
|------------|------|------------|
| **Render Blueprint (Recommended)** | 10 min | ⭐ Easy |
| **Manual Render Setup** | 15 min | ⭐⭐ Medium |

---

## Prerequisites

- [Render](https://render.com) account (free tier available)
- [Neon](https://neon.tech) account (free tier available)
- [GitHub](https://github.com) repository (already set up)
- Companies House API key (optional, for company lookup)

---

## Step 1: Set Up Neon Database

### Create Neon Project

1. Go to [neon.tech](https://neon.tech) and sign up/log in
2. Click **"New Project"**
3. Configure:
   - **Project name**: `aml-guardian-pro`
   - **Region**: Select closest to your users (e.g., `Europe (Frankfurt)`)
   - **PostgreSQL version**: 15
4. Click **"Create Project"**

### Get Connection String

1. In your Neon dashboard, go to **"Connection Details"**
2. Select **"Node.js"** from the dropdown
3. Copy the connection string (format: `postgresql://user:password@host/database?sslmode=require`)
4. **Save this** - you'll need it in Render

---

## Step 2: Deploy to Render Using Blueprint (Easiest)

### What is a Blueprint?

The `render.yaml` file in your repo tells Render exactly how to set up your services. One click and both backend + frontend are deployed!

### Deploy Steps

1. **Push your code to GitHub** (already done)
   ```bash
   git push origin master
   ```

2. **Go to Render Dashboard**
   - Visit [dashboard.render.com](https://dashboard.render.com)

3. **Create Blueprint Instance**
   - Click **"New +"** → **"Blueprint"**
   - Connect your GitHub repo: `Will-Massey/aml-guardian-pro`
   - Render will detect `render.yaml` and show you the services to create:
     - ✅ `aml-guardian-backend` (Web Service)
     - ✅ `aml-guardian-frontend` (Static Site)

4. **Apply Blueprint**
   - Click **"Apply"**
   - Render creates both services automatically

5. **Set Environment Variables**

   Go to **aml-guardian-backend** → **Environment** and add:

   | Variable | Value | Secret? |
   |----------|-------|---------|
   | `DATABASE_URL` | Your Neon connection string | ✅ Yes |
   | `JWT_SECRET` | Generate: `openssl rand -base64 32` | ✅ Yes |
   | `COMPANIES_HOUSE_API_KEY` | Your API key | ✅ Yes |
   | `CORS_ORIGINS` | Will be updated after frontend deploy | No |

6. **Deploy!**
   - Click **"Manual Deploy"** → **"Deploy latest commit"**
   - Wait for build to complete (2-3 minutes)

---

## Step 3: Configure Frontend

1. After backend deploys, copy the backend URL:
   - Format: `https://aml-guardian-backend.onrender.com`

2. Go to **aml-guardian-frontend** → **Environment**
   - Add: `VITE_API_URL=https://aml-guardian-backend.onrender.com/api`

3. Redeploy frontend if needed

---

## Step 4: Update CORS

1. Go to **aml-guardian-backend** → **Environment**
2. Update `CORS_ORIGINS` with your frontend URL:
   ```
   CORS_ORIGINS=https://aml-guardian-frontend.onrender.com
   ```
3. Click **Save Changes** and redeploy

---

## Step 5: Verify Deployment

Test these endpoints:

```bash
# Health check
curl https://aml-guardian-backend.onrender.com/api/health

# Should return:
{"status":"healthy","timestamp":"...","version":"1.0.0"}
```

Visit your frontend:
```
https://aml-guardian-frontend.onrender.com
```

---

## Environment Variables Reference

### Backend (`aml-guardian-backend`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Neon PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Random string (32+ chars) |
| `COMPANIES_HOUSE_API_KEY` | ⚠️ | For company lookup features |
| `CORS_ORIGINS` | ✅ | Frontend URL(s) |
| `NODE_ENV` | ✅ | `production` (auto-set) |
| `PORT` | ✅ | `10000` (auto-set) |
| `UPLOAD_DIR` | ✅ | `/tmp/uploads` (auto-set) |
| `LOG_LEVEL` | ❌ | `info` (default) |
| `CLAURST_PROVIDER` | ⚠️ | `anthropic` (for AI features) |
| `CLAURST_MODEL` | ⚠️ | `claude-opus-4` (for AI features) |

### Frontend (`aml-guardian-frontend`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | ✅ | Backend URL + `/api` |

---

## Automatic Deployments

Once set up, Render **auto-deploys** on every push to `master`:

```bash
git add .
git commit -m "Add new feature"
git push origin master  # → Auto-deploys to Render!
```

You can disable auto-deploy in:
- Render Dashboard → Service → Settings → Auto-Deploy

---

## Troubleshooting

### Build Fails

**Check Render Dashboard → Service → Logs**

Common issues:

| Error | Solution |
|-------|----------|
| `Cannot find module 'dist/index.js'` | Build step failed - check TypeScript errors |
| `Database connection failed` | Verify `DATABASE_URL` is set correctly |
| `P3006 Migration failed` | Database schema issue - check migrations |
| `CORS error` | Update `CORS_ORIGINS` with exact frontend URL |

### Database Connection Issues

1. Ensure Neon connection string includes `?sslmode=require`
2. Check Neon dashboard - is the database active? (Free tier pauses after inactivity)
3. Verify IP allowlist in Neon allows all connections

### Rollback

If a deployment breaks:

1. Go to Render Dashboard → Service → **Logs**
2. Click **"Deploy"** tab
3. Find previous working commit
4. Click **"Rollback"**

---

## Render Dashboard URLs

- **Dashboard**: https://dashboard.render.com
- **Your Backend**: https://dashboard.render.com/web/srv-xxx
- **Your Frontend**: https://dashboard.render.com/static/srv-xxx

---

## Next Steps

1. ✅ Set up custom domain (Settings → Custom Domain)
2. ✅ Enable metrics monitoring (Metrics tab)
3. ✅ Configure backup strategy (Neon handles this)
4. ✅ Set up log retention (7 days on free tier)

---

**Need Help?**
- Render Docs: https://render.com/docs
- Neon Docs: https://neon.tech/docs
- Project Repo: https://github.com/Will-Massey/aml-guardian-pro
