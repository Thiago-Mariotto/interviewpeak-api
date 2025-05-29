#!/bin/bash

# Colors for console output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}============================================${NC}"
echo -e "${GREEN}Database Schema Update for Interview Platform${NC}"
echo -e "${YELLOW}============================================${NC}"

# Check if running in Docker
if [ -f "/.dockerenv" ]; then
  echo -e "${YELLOW}Running in Docker environment${NC}"
  
  # Make backup of database (optional)
  echo -e "${YELLOW}Creating database backup...${NC}"
  DATABASE_URL=$(grep DATABASE_URL .env | cut -d '=' -f2)
  NOW=$(date +"%Y%m%d_%H%M%S")
  pg_dump -c "$DATABASE_URL" > "backup_${NOW}.sql" || echo -e "${YELLOW}Backup failed, but continuing...${NC}"
  
  echo -e "${YELLOW}Applying database schema updates...${NC}"
  
  # Push the schema changes
  npx prisma db push --accept-data-loss
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Database schema updated successfully!${NC}"
  else
    echo -e "${RED}Error updating database schema.${NC}"
    exit 1
  fi
  
  # Regenerate Prisma client with updated schema
  echo -e "${YELLOW}Regenerating Prisma client...${NC}"
  npx prisma generate
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Prisma client regenerated successfully!${NC}"
  else
    echo -e "${RED}Error regenerating Prisma client.${NC}"
    exit 1
  fi
else
  # Development environment
  echo -e "${YELLOW}Running in development environment${NC}"
  
  echo -e "${YELLOW}Applying database migration...${NC}"
  npx prisma migrate dev --name add_user_relations
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Migration completed successfully!${NC}"
  else
    echo -e "${RED}Error during migration.${NC}"
    exit 1
  fi
fi

echo -e "${GREEN}Schema update completed!${NC}"
echo -e "${YELLOW}Note: Existing interviews may need to be associated with users manually.${NC}"