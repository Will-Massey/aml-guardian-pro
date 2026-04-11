#!/bin/bash

# AML Guardian Pro - Railway Deployment Script
# Usage: ./deploy-railway.sh [backend|frontend|all]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}AML Guardian Pro - Railway Deployment${NC}"
echo "======================================"

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}Railway CLI not found. Installing...${NC}"
    npm install -g @railway/cli
fi

# Check if user is logged in
if ! railway whoami &> /dev/null; then
    echo -e "${YELLOW}Please login to Railway:${NC}"
    railway login
fi

# Function to deploy backend
deploy_backend() {
    echo -e "\n${BLUE}Deploying Backend...${NC}"
    cd backend
    
    # Check if already linked
    if [ ! -f .railway/config.json ]; then
        echo -e "${YELLOW}Initializing Railway project for backend...${NC}"
        railway init --name aml-guardian-backend
    fi
    
    # Check for required env vars
    echo -e "${YELLOW}Checking environment variables...${NC}"
    
    REQUIRED_VARS=("DATABASE_URL" "JWT_SECRET" "COMPANIES_HOUSE_API_KEY")
    MISSING_VARS=()
    
    for var in "${REQUIRED_VARS[@]}"; do
        if ! railway variables get "$var" &> /dev/null; then
            MISSING_VARS+=("$var")
        fi
    done
    
    if [ ${#MISSING_VARS[@]} -ne 0 ]; then
        echo -e "${RED}Missing required environment variables:${NC}"
        printf '%s\n' "${MISSING_VARS[@]}"
        echo -e "\n${YELLOW}Please set them using:${NC}"
        echo "railway variables set VARIABLE_NAME=value"
        echo -e "\nOr use the Railway dashboard."
        exit 1
    fi
    
    # Deploy
    echo -e "${GREEN}Deploying backend...${NC}"
    railway up
    
    echo -e "${GREEN}Backend deployed successfully!${NC}"
    echo -e "URL: $(railway domain)"
    
    cd ..
}

# Function to deploy frontend
deploy_frontend() {
    echo -e "\n${BLUE}Deploying Frontend...${NC}"
    cd frontend
    
    # Check if backend URL is set
    if [ -z "$BACKEND_URL" ]; then
        echo -e "${YELLOW}Enter your backend Railway URL:${NC}"
        echo "(e.g., https://aml-guardian-backend.up.railway.app)"
        read -r BACKEND_URL
    fi
    
    # Set API URL
    export VITE_API_URL="${BACKEND_URL}/api"
    
    # Check if already linked
    if [ ! -f .railway/config.json ]; then
        echo -e "${YELLOW}Initializing Railway project for frontend...${NC}"
        railway init --name aml-guardian-frontend
    fi
    
    # Set environment variable
    railway variables set VITE_API_URL="$VITE_API_URL"
    
    # Deploy
    echo -e "${GREEN}Deploying frontend...${NC}"
    railway up
    
    echo -e "${GREEN}Frontend deployed successfully!${NC}"
    echo -e "URL: $(railway domain)"
    
    cd ..
}

# Main deployment logic
case "${1:-all}" in
    backend)
        deploy_backend
        ;;
    frontend)
        deploy_frontend
        ;;
    all)
        deploy_backend
        echo -e "\n${YELLOW}Backend deployed. Save this URL for the frontend deployment.${NC}"
        echo -e "${YELLOW}Press Enter to continue with frontend deployment...${NC}"
        read -r
        deploy_frontend
        
        echo -e "\n${GREEN}======================================${NC}"
        echo -e "${GREEN}Deployment Complete!${NC}"
        echo -e "${GREEN}======================================${NC}"
        echo -e "\n${YELLOW}Important:${NC} Update backend CORS_ORIGINS with your frontend URL:"
        echo -e "cd backend && railway variables set CORS_ORIGINS=\"$(railway domain)\""
        ;;
    *)
        echo "Usage: $0 [backend|frontend|all]"
        exit 1
        ;;
esac

echo -e "\n${GREEN}Done!${NC}"
