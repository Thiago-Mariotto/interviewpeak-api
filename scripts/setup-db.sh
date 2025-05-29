#!/bin/bash

# Colors for console output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}============================================${NC}"
echo -e "${GREEN}Database Setup for Interview Simulation Platform${NC}"
echo -e "${YELLOW}============================================${NC}"

# Check if Prisma CLI is installed
if ! [ -x "$(command -v npx prisma)" ]; then
  echo -e "${RED}Error: Prisma CLI is not available.${NC}"
  echo "Make sure you have run 'npm install' to install dependencies."
  exit 1
fi

# Generate Prisma client
echo -e "${YELLOW}Generating Prisma client...${NC}"
npx prisma generate

# Check if we're running in Docker
if [ -f "/.dockerenv" ]; then
  echo -e "${YELLOW}Running in Docker environment${NC}"
  
  # Wait for PostgreSQL to be ready
  echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
  
  # Simple retry mechanism
  MAX_RETRIES=30
  RETRY_COUNT=0
  
  while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if npx prisma db push --accept-data-loss; then
      echo -e "${GREEN}Database is ready!${NC}"
      break
    else
      RETRY_COUNT=$((RETRY_COUNT+1))
      echo -e "${YELLOW}Waiting for database... (Attempt $RETRY_COUNT/$MAX_RETRIES)${NC}"
      sleep 2
    fi
  done
  
  if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}Error: Could not connect to the database after $MAX_RETRIES attempts.${NC}"
    exit 1
  fi
else
  # Apply database migrations (development environment)
  echo -e "${YELLOW}Applying database migrations...${NC}"
  npx prisma migrate dev --name init
fi

echo -e "${GREEN}Database setup completed successfully!${NC}"