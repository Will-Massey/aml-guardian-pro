#!/bin/bash

# AML Guardian Pro - Render Deployment Script
# Usage: ./deploy-render.sh

set -e

echo "======================================"
echo "AML Guardian Pro - Render Deployment"
echo "======================================"
echo ""
echo "This script will help you deploy to Render."
echo ""

# Check if render CLI is installed (optional)
if command -v render &> /dev/null; then
    echo "✓ Render CLI found"
else
    echo "ℹ️  Render CLI not installed. Install with:"
    echo "   curl -fsSL https://render.com/install-cli | bash"
    echo ""
    echo "Or deploy manually via the Render dashboard:"
    echo "   https://dashboard.render.com"
fi

echo ""
echo "======================================"
echo "Deployment Steps:"
echo "======================================"
echo ""
echo "1. Push code to GitHub:"
echo "   git push origin master"
echo ""
echo "2. Go to Render Dashboard:"
echo "   https://dashboard.render.com"
echo ""
echo "3. Click 'New +' and select 'Blueprint'"
echo ""
echo "4. Connect your GitHub repo:"
echo "   Will-Massey/aml-guardian-pro"
echo ""
echo "5. Render will auto-detect render.yaml and create services:"
echo "   - aml-guardian-backend (Web Service)"
echo "   - aml-guardian-frontend (Static Site)"
echo ""
echo "6. Set required secrets in Render Dashboard:"
echo "   → Backend Service → Environment"
echo ""
echo "   Required Variables:"
echo "   - DATABASE_URL=postgresql://... (from Neon)"
echo "   - JWT_SECRET=your-secure-secret"
echo "   - COMPANIES_HOUSE_API_KEY=your-api-key"
echo "   - CORS_ORIGINS=https://your-frontend-url.onrender.com"
echo ""
echo "7. Deploy! Render will auto-deploy on future pushes."
echo ""
echo "======================================"
echo ""

# Ask if user wants to open Render dashboard
read -p "Open Render dashboard? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    open https://dashboard.render.com/blueprints || xdg-open https://dashboard.render.com/blueprints || echo "Please open: https://dashboard.render.com/blueprints"
fi

echo ""
echo "Done! Follow the steps above to complete deployment."
