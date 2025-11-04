#!/bin/bash
#
# Automated Rollback Script for fe-engine-prime
# FE-538: Rollback Automation
#
# Usage:
#   ./scripts/rollback.sh                    # Rollback to previous successful deployment
#   ./scripts/rollback.sh <target-sha>       # Rollback to specific SHA
#   ./scripts/rollback.sh --list             # List available rollback targets
#
# Environment Variables:
#   PRODUCTION_URL    - Production URL (default: from .env)
#   VERCEL_TOKEN      - Vercel authentication token
#   VERCEL_ORG_ID     - Vercel organization ID
#   VERCEL_PROJECT_ID - Vercel project ID
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TARGET_SHA="${1:-}"
PRODUCTION_URL="${PRODUCTION_URL:-}"
HEALTH_ENDPOINT="/api/health"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Functions
print_header() {
    echo ""
    echo "════════════════════════════════════════════════════════"
    echo "  $1"
    echo "════════════════════════════════════════════════════════"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

list_rollback_targets() {
    print_header "Available Rollback Targets"

    echo "Recent successful deployments:"
    echo ""

    # List deployment tags
    DEPLOY_TAGS=$(git tag -l "deploy-success-*" --sort=-creatordate | head -10)

    if [ -z "$DEPLOY_TAGS" ]; then
        print_warning "No deployment tags found"
        echo ""
        echo "Recent commits (last 10):"
        git log --oneline -10
    else
        echo "Deployment Tags:"
        echo ""
        for tag in $DEPLOY_TAGS; do
            SHA=$(git rev-list -n 1 "$tag")
            SHORT_SHA="${SHA:0:7}"
            COMMIT_MSG=$(git log --format=%B -n 1 "$SHA" | head -1)
            DATE=$(git log --format="%cd" --date=short -n 1 "$SHA")

            echo "  ${tag}"
            echo "    SHA: ${SHORT_SHA}"
            echo "    Date: ${DATE}"
            echo "    Message: ${COMMIT_MSG}"
            echo ""
        done
    fi

    echo "Usage:"
    echo "  ./scripts/rollback.sh <sha>   # Rollback to specific SHA"
    echo ""
}

validate_environment() {
    print_info "Validating environment..."

    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Not a git repository"
        exit 1
    fi

    # Check if Vercel CLI is available
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI not found, installing..."
        npm install -g vercel@latest
    fi

    # Check for Vercel credentials
    if [ -z "$VERCEL_TOKEN" ]; then
        print_warning "VERCEL_TOKEN not set"
        print_info "Vercel CLI will use local credentials"
    fi

    print_success "Environment validated"
}

determine_rollback_target() {
    local target="$1"

    if [ -z "$target" ]; then
        print_info "No target SHA provided, finding previous successful deployment..."

        # Look for deployment tags
        DEPLOY_TAGS=$(git tag -l "deploy-success-*" --sort=-creatordate)

        if [ -n "$DEPLOY_TAGS" ]; then
            LATEST_TAG=$(echo "$DEPLOY_TAGS" | head -1)
            target=$(git rev-list -n 1 "$LATEST_TAG")
            print_info "Found deployment tag: ${LATEST_TAG}"
        else
            # Fallback to previous commit
            target=$(git log --pretty=format:"%H" -n 2 | tail -1)
            print_warning "No deployment tags found, using previous commit"
        fi
    fi

    # Validate SHA
    if ! git cat-file -e "${target}^{commit}" 2>/dev/null; then
        print_error "Invalid or non-existent SHA: ${target}"
        exit 1
    fi

    echo "$target"
}

display_rollback_info() {
    local sha="$1"

    print_info "Rollback Target Information:"
    echo ""
    echo "  SHA: ${sha}"
    echo "  Short SHA: ${sha:0:7}"
    echo "  Commit Message: $(git log --format=%B -n 1 "$sha" | head -1)"
    echo "  Author: $(git log --format="%an" -n 1 "$sha")"
    echo "  Date: $(git log --format="%cd" -n 1 "$sha")"
    echo ""
}

confirm_rollback() {
    local sha="$1"

    if [ -t 0 ]; then  # Only prompt if stdin is a terminal
        echo -n "Proceed with rollback to ${sha:0:7}? [y/N] "
        read -r response
        case "$response" in
            [yY][eE][sS]|[yY])
                return 0
                ;;
            *)
                print_warning "Rollback cancelled"
                exit 0
                ;;
        esac
    fi
}

execute_rollback() {
    local sha="$1"

    print_header "Executing Rollback"

    # Step 1: Checkout target version
    print_info "Checking out target version..."
    git checkout "$sha"
    print_success "Checked out ${sha:0:7}"

    # Step 2: Install dependencies
    print_info "Installing dependencies..."
    cd "$PROJECT_ROOT"

    if ! pnpm install --frozen-lockfile; then
        print_error "Failed to install dependencies"
        git checkout -
        exit 1
    fi

    print_success "Dependencies installed"

    # Step 3: Build application
    print_info "Building application..."

    if ! pnpm run build; then
        print_error "Build failed"
        git checkout -
        exit 1
    fi

    print_success "Build completed"

    # Step 4: Deploy to Vercel
    print_info "Deploying to Vercel (production)..."

    DEPLOY_OUTPUT=$(vercel deploy --prod --yes 2>&1)
    DEPLOY_URL=$(echo "$DEPLOY_OUTPUT" | grep -oP 'https://[^\s]+' | tail -1)

    if [ -z "$DEPLOY_URL" ]; then
        print_error "Failed to get deployment URL"
        print_info "Vercel output:"
        echo "$DEPLOY_OUTPUT"
        exit 1
    fi

    print_success "Deployed to: ${DEPLOY_URL}"

    # Update PRODUCTION_URL if not set
    if [ -z "$PRODUCTION_URL" ]; then
        PRODUCTION_URL="$DEPLOY_URL"
    fi

    echo "$DEPLOY_URL"
}

validate_rollback() {
    local deploy_url="$1"
    local health_url="${deploy_url}${HEALTH_ENDPOINT}"

    print_header "Validating Rollback"

    print_info "Waiting 60 seconds for service to stabilize..."
    sleep 60

    print_info "Running health checks..."
    echo ""

    MAX_ATTEMPTS=3
    RETRY_DELAY=30
    SUCCESS=false

    for i in $(seq 1 $MAX_ATTEMPTS); do
        echo "  Attempt $i/$MAX_ATTEMPTS..."

        RESPONSE=$(curl -s -w "\n%{http_code}" "$health_url" 2>/dev/null || echo "0")
        HTTP_CODE=$(echo "$RESPONSE" | tail -1)
        BODY=$(echo "$RESPONSE" | head -n -1)

        if [ "$HTTP_CODE" -eq 200 ]; then
            print_success "Health check passed"
            echo ""
            echo "Response:"
            echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
            SUCCESS=true
            break
        else
            print_error "Health check failed (HTTP ${HTTP_CODE})"

            if [ $i -lt $MAX_ATTEMPTS ]; then
                print_info "Retrying in ${RETRY_DELAY}s..."
                sleep $RETRY_DELAY
            fi
        fi
    done

    if [ "$SUCCESS" = false ]; then
        print_error "Health check failed after ${MAX_ATTEMPTS} attempts"
        return 1
    fi

    return 0
}

tag_successful_rollback() {
    local sha="$1"

    print_info "Tagging successful rollback..."

    ROLLBACK_TAG="rollback-$(date +%Y%m%d-%H%M%S)-${sha:0:7}"

    git config user.name "Rollback Script"
    git config user.email "rollback@fe-engine-prime"

    git tag -a "$ROLLBACK_TAG" -m "Rollback to ${sha}" -m "Executed by: $(whoami)" -m "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

    if git push origin "$ROLLBACK_TAG" 2>/dev/null; then
        print_success "Rollback tag created: ${ROLLBACK_TAG}"
    else
        print_warning "Failed to push tag (continuing anyway)"
    fi
}

# Main Script
main() {
    print_header "Automated Rollback - fe-engine-prime"

    # Handle special commands
    if [ "$TARGET_SHA" = "--list" ] || [ "$TARGET_SHA" = "-l" ]; then
        list_rollback_targets
        exit 0
    fi

    if [ "$TARGET_SHA" = "--help" ] || [ "$TARGET_SHA" = "-h" ]; then
        echo "Usage: $0 [options] [target-sha]"
        echo ""
        echo "Options:"
        echo "  --list, -l      List available rollback targets"
        echo "  --help, -h      Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0                    Rollback to previous successful deployment"
        echo "  $0 abc1234            Rollback to specific SHA"
        echo "  $0 --list             List available rollback targets"
        echo ""
        exit 0
    fi

    # Validate environment
    validate_environment

    # Determine rollback target
    ROLLBACK_TARGET=$(determine_rollback_target "$TARGET_SHA")

    # Display rollback info
    display_rollback_info "$ROLLBACK_TARGET"

    # Confirm rollback
    confirm_rollback "$ROLLBACK_TARGET"

    # Execute rollback
    DEPLOY_URL=$(execute_rollback "$ROLLBACK_TARGET")

    # Validate rollback
    if validate_rollback "$DEPLOY_URL"; then
        # Tag successful rollback
        tag_successful_rollback "$ROLLBACK_TARGET"

        # Success summary
        print_header "Rollback Completed Successfully"
        print_success "Target SHA: ${ROLLBACK_TARGET}"
        print_success "Deployment URL: ${DEPLOY_URL}"
        print_success "Health check: Passed"
        echo ""
        exit 0
    else
        # Failure summary
        print_header "Rollback Failed"
        print_error "Health check validation failed"
        print_warning "Manual intervention required"
        echo ""
        exit 1
    fi
}

# Run main function
main
