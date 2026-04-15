# AML Guardian Pro - Project Status

**Last Updated:** 2026-04-15  
**Current Branch:** `master`  
**GitHub Repo:** https://github.com/Will-Massey/aml-guardian-pro

---

## ✅ What's Done (Pushed to GitHub)

### 1. Build System Fixes
- **ESLint configured** for both backend and frontend (`.eslintrc.json`)
- **TypeScript builds pass** cleanly (`tsc --noEmit` on both sides)
- **Backend `npm run build`** compiles successfully
- **Frontend `npm run build`** produces production bundle successfully

### 2. Render Deployment Fixes
- **Replaced `puppeteer`** with `puppeteer-core` + `@sparticuz/chromium` to fix 20+ minute build hangs
- **Added `PUPPETEER_SKIP_DOWNLOAD=true`** environment variable
- **Switched build command** to `npm ci --include=dev` so TypeScript types install during production builds
- **Added `.nvmrc`** (Node 20) for consistent builds
- **Fixed CORS** by hardcoding `CORS_ORIGINS: https://aml-guardian-frontend.onrender.com` in `render.yaml`
- **Fixed crash loop** caused by unhandled notification scheduler rejections killing the process

### 3. Code Fixes
- **Fixed `auth.ts`** Express namespace augmentation with proper `eslint-disable` comment
- **Fixed `documentProcessor/index.ts`** regex escapes and `require('fs')` usage
- **Added admin routes** (`/api/admin/*`) and `SUPERADMIN` role support
- **Updated seed script** with demo superadmin credentials

### 4. Database
- **SuperAdmin migration** added (`20260414084713_add_superadmin_role`)
- **Prisma seed command** wired up in `package.json`
- **Demo user created** in production database via API registration

---

## 🔧 Render Deploy Status

### Backend Service
- **URL:** https://aml-guardian-backend.onrender.com
- **Health:** `/api/health` and `/health` both working
- **Status:** Stable after crash-loop fix
- **Action Required:** Latest commit (`0e8ebfa`) has been pushed but you should verify the deploy succeeded in the Render dashboard

### Frontend Service
- **URL:** https://aml-guardian-frontend.onrender.com
- **Status:** Loads correctly
- **Build:** Successful

---

## 🔑 Demo Credentials

### Production (Already Created)
- **Email:** `admin@demo.practice`
- **Password:** `DemoPass123!`
- **Role:** `ACCOUNTANT`

### Seed Script (Run when you have shell access)
- **Email:** `admin@demo.practice` / `DemoPass123!` (SUPERADMIN)
- **Email:** `admin@example.com` / `Test1234!` (ADMIN)
- **Command:** `npx prisma db seed`

---

## 📋 How to Resume Later

### Local Development
```bash
cd aml-guardian-pro
npm run install:all
npm run dev
```

### Run Tests / Validation
```bash
cd aml-guardian-pro
npm run lint        # ESLint both workspaces
npm run build       # Production builds
```

### Database Operations
```bash
cd aml-guardian-pro/backend
npx prisma migrate dev
npx prisma generate
npx prisma db seed
npx prisma studio
```

### Render Manual Deploy
If auto-deploy is stuck, go to:
- https://dashboard.render.com/web/services/aml-guardian-backend
- Click **Manual Deploy → Deploy latest commit**

---

## ⚠️ Known Items for Future Work

1. **GitHub Actions CI** is currently failing on "Install dependencies (Backend)" step for the `engage` project (unrelated). The AML Guardian CI should pass now.
2. **Admin dashboard** endpoints now return real data queries instead of hardcoded zeros.
3. **PDF Generation** uses `@sparticuz/chromium` — verify it works on Render by generating a document.
4. **ESLint warnings** exist (136 backend, 63 frontend) but all are non-blocking warnings only.

---

## 📁 Key Files Changed

- `render.yaml`
- `backend/.nvmrc`
- `backend/.eslintrc.json`
- `backend/package.json`
- `backend/prisma/seed.ts`
- `backend/src/middleware/auth.ts`
- `backend/src/services/pdf/index.ts`
- `backend/src/services/notifications/index.ts`
- `backend/src/index.ts`
- `frontend/.eslintrc.json`
