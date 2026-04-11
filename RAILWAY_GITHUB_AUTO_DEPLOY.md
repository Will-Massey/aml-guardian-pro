# Railway + GitHub Automatic Deployment Guide

This guide explains how automatic deployment works when you connect your GitHub repository to Railway.

---

## Overview: Two Deployment Methods

| Method | Complexity | Best For |
|--------|-----------|----------|
| **Railway Native GitHub Integration** | ⭐ Easy | Most projects (RECOMMENDED) |
| **GitHub Actions + Railway CLI** | ⭐⭐ Medium | Custom workflows, multiple envs |

---

## Method 1: Railway Native GitHub Integration (Recommended)

This is the **easiest** way - Railway watches your GitHub repo and auto-deploys on every push.

### How It Works

```
┌──────────────┐     Push to main     ┌─────────────┐     Auto Deploy     ┌──────────────┐
│  Developer   │ ───────────────────► │    GitHub   │ ──────────────────► │   Railway    │
│  (You)       │                      │   Repository│                     │  (Hosting)   │
└──────────────┘                      └─────────────┘                     └──────────────┘
                                                                                │
                                                                                ▼
                                                                        ┌──────────────┐
                                                                        │   Services   │
                                                                        │  - Backend   │
                                                                        │  - Frontend  │
                                                                        └──────────────┘
```

### Setup Steps

#### Step 1: Push Code to GitHub

```bash
# Initialize git repo
cd aml-guardian-pro
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit with Railway config"

# Create GitHub repo (via CLI or web)
gh repo create aml-guardian-pro --public --push --source=.

# Or manually:
# git remote add origin https://github.com/YOUR_USERNAME/aml-guardian-pro.git
# git push -u origin main
```

#### Step 2: Connect Railway to GitHub

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Select your `aml-guardian-pro` repository
5. Railway will detect the `railway.json` and service configs automatically

#### Step 3: Configure Services

Railway will create **two services** based on your config:

| Service | Source | Detected From |
|---------|--------|---------------|
| `aml-guardian-backend` | `/backend` | `backend/railway.toml` |
| `aml-guardian-frontend` | `/frontend` | `frontend/railway.toml` |

#### Step 4: Set Environment Variables

In Railway dashboard, set these variables for each service:

**Backend Service:**
```
DATABASE_URL=postgresql://... (from Neon)
JWT_SECRET=your-secure-secret
COMPANIES_HOUSE_API_KEY=your-api-key
CORS_ORIGINS=https://your-frontend.up.railway.app
```

**Frontend Service:**
```
VITE_API_URL=https://your-backend.up.railway.app/api
```

#### Step 5: Automatic Deployments Are Now Active! ✅

Now whenever you push to `main`:
```bash
git add .
git commit -m "Add new feature"
git push origin main
```

Railway automatically:
1. Detects the push
2. Builds both services
3. Runs migrations (`npx prisma migrate deploy`)
4. Deploys new versions
5. Updates health checks

---

## Method 2: GitHub Actions + Railway CLI

Use this if you need:
- Custom build steps
- Testing before deploy
- Multiple environments (staging/production)
- Approval workflows

### How It Works

```
┌──────────────┐     Push to main      ┌──────────────────┐    Trigger    ┌──────────────┐
│  Developer   │ ─────────────────────►│  GitHub Actions  │──────────────►│   Railway    │
│  (You)       │                       │     Workflow     │   (CLI/API)   │              │
└──────────────┘                       └──────────────────┘               └──────────────┘
                                                │
                                                ▼
                                       ┌──────────────────┐
                                       │  Steps:          │
                                       │  1. Checkout     │
                                       │  2. Test         │
                                       │  3. Build        │
                                       │  4. Deploy       │
                                       └──────────────────┘
```

### Setup Steps

#### Step 1: Get Railway Tokens

```bash
# Login to Railway
railway login

# Generate tokens for each service
railway token --name "GitHub Actions Backend"
# Copy the token (starts with 't0-...')

railway token --name "GitHub Actions Frontend"
# Copy the token
```

#### Step 2: Add Tokens to GitHub Secrets

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret Name | Value |
|-------------|-------|
| `RAILWAY_BACKEND_TOKEN` | Backend token from above |
| `RAILWAY_FRONTEND_TOKEN` | Frontend token from above |

#### Step 3: Push the Workflow Files

The workflow files are already in `.github/workflows/`:
- `deploy.yml` - Main deployment workflow
- `pr-preview.yml` - PR build checks

```bash
git add .github/workflows/
git commit -m "Add GitHub Actions deployment workflows"
git push origin main
```

#### Step 4: Automatic Deployment Active! ✅

Now on every push to `main`:
1. GitHub Actions runs tests
2. If tests pass, deploys to Railway
3. Posts deployment status

---

## Deployment Behavior Comparison

| Feature | Railway Native | GitHub Actions |
|---------|---------------|----------------|
| **Trigger** | Git push | Git push |
| **Build Location** | Railway servers | Railway servers |
| **Test Before Deploy** | ❌ No | ✅ Yes |
| **Custom Steps** | ❌ Limited | ✅ Full control |
| **Multiple Environments** | ❌ Manual | ✅ Automated |
| **Deployment Speed** | ⚡ Fast | ⚡ Fast |
| **Rollbacks** | ✅ One-click | ✅ One-click |
| **Logs** | Railway dashboard | GitHub + Railway |

---

## Recommended: Hybrid Approach

For most projects, use **both**:

1. **Railway Native** for:
   - Development branch auto-deploys
   - Quick iteration
   - Preview environments

2. **GitHub Actions** for:
   - Production deployments (with tests)
   - Release workflows
   - Complex multi-step deployments

---

## Environment-Specific Deployments

### Staging + Production Setup

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy-staging:
    if: github.ref == 'refs/heads/develop'
    # Deploys to staging environment
    
  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: [test, deploy-staging]
    # Deploys to production after staging passes
```

### Branch-Based Auto-Deploy

| Branch | Environment | Method |
|--------|-------------|--------|
| `main` | Production | GitHub Actions (with approval) |
| `develop` | Staging | Railway Native |
| `feature/*` | Preview | Railway Native |

---

## Monitoring Deployments

### Railway Dashboard
- View deployment logs: `railway logs`
- Check service status: `railway status`
- View metrics: Dashboard → Metrics

### GitHub Actions
- View workflow runs: Repo → Actions tab
- Check deployment status in PR checks

### CLI
```bash
# Watch logs in real-time
railway logs -f

# Check deployment status
railway status

# View specific deployment
railway history
```

---

## Rollback Strategy

### Via Railway Dashboard
1. Go to service → Deployments
2. Find previous working deployment
3. Click "Redeploy"

### Via CLI
```bash
# List deployments
railway history

# Rollback to specific deployment
railway rollback <deployment-id>
```

### Via Git
```bash
# Revert commit
git revert HEAD
git push origin main

# Or reset to previous commit
git reset --hard HEAD~1
git push origin main --force
```

---

## Troubleshooting Auto-Deploy

### Issue: Deployments Not Triggering

**Check:**
1. Is GitHub repo connected to Railway?
   - Railway Dashboard → Project → Settings → GitHub
2. Is the branch correct?
   - Default is `main`, update if using `master`
3. Are webhook permissions correct?
   - GitHub → Settings → Webhooks

### Issue: Build Fails

**Check logs:**
```bash
railway logs
```

**Common fixes:**
- Missing environment variables
- Database connection issues
- Prisma generate not running

### Issue: CORS Errors After Deploy

**Fix:**
```bash
cd backend
railway variables set CORS_ORIGINS="https://your-frontend.up.railway.app"
```

---

## Quick Start Checklist

### For Railway Native Integration:
- [ ] Push code to GitHub
- [ ] Connect repo in Railway dashboard
- [ ] Set environment variables
- [ ] Test with a small change + push
- [ ] Verify auto-deploy works

### For GitHub Actions:
- [ ] Generate Railway tokens
- [ ] Add tokens to GitHub secrets
- [ ] Push workflow files
- [ ] Test workflow in Actions tab
- [ ] Verify deployment triggers

---

## Next Steps

1. **Choose your method** (Native vs Actions)
2. **Set up the connection** (GitHub repo)
3. **Configure environment variables**
4. **Test the deployment flow**
5. **Set up branch protection rules** (for production)

---

**Need Help?**
- Railway Docs: https://docs.railway.app/deploy/integrations
- GitHub Actions Docs: https://docs.github.com/actions
- Railway Discord: https://discord.gg/railway
