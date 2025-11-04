#!/bin/bash

# Health Check Script for fe-engine-prime
# FE-500: Health Check Automation
#
# Usage:
#   ./scripts/health-check.sh [URL]
#
# Examples:
#   ./scripts/health-check.sh                          # Check localhost:3000
#   ./scripts/health-check.sh https://staging.app.com  # Check staging
#   ./scripts/health-check.sh https://prod.app.com     # Check production

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
URL="${1:-http://localhost:3000}"
HEALTH_ENDPOINT="${URL}/api/health"
MAX_RETRIES=3
RETRY_DELAY=2

echo "════════════════════════════════════════════════════════"
echo "  Health Check: fe-engine-prime"
echo "════════════════════════════════════════════════════════"
echo ""
echo "Target: ${URL}"
echo "Endpoint: ${HEALTH_ENDPOINT}"
echo ""

# Function to perform health check
check_health() {
  local attempt=$1
  echo -n "Attempt ${attempt}/${MAX_RETRIES}... "

  RESPONSE=$(curl -s -w "\n%{http_code}" "${HEALTH_ENDPOINT}" 2>/dev/null) || {
    echo -e "${RED}✗ Connection failed${NC}"
    return 1
  }

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | head -n -1)

  if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ Healthy${NC}"
    echo ""
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    return 0
  else
    echo -e "${RED}✗ Unhealthy (HTTP ${HTTP_CODE})${NC}"
    return 1
  fi
}

# Perform health check with retries
SUCCESS=false
for i in $(seq 1 $MAX_RETRIES); do
  if check_health "$i"; then
    SUCCESS=true
    break
  fi

  if [ $i -lt $MAX_RETRIES ]; then
    echo -e "${YELLOW}Retrying in ${RETRY_DELAY}s...${NC}"
    sleep $RETRY_DELAY
  fi
done

echo ""
echo "════════════════════════════════════════════════════════"

if [ "$SUCCESS" = true ]; then
  echo -e "${GREEN}✓ Health check passed${NC}"
  exit 0
else
  echo -e "${RED}✗ Health check failed after ${MAX_RETRIES} attempts${NC}"
  exit 1
fi
