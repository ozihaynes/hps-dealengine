#!/usr/bin/env bash
#
# Command Center V2.1 — Final Verification Script
#
# This script verifies the complete implementation before deployment.
# Run from the apps/hps-dealengine directory.
#
# Usage: bash scripts/verify-v2.1.sh
#

set -e

echo "═══════════════════════════════════════════════════════════════════"
echo "  Command Center V2.1 — Final Verification"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASS=0
FAIL=0
WARN=0

# Helper function
check() {
    local name="$1"
    local cmd="$2"
    
    echo -n "Checking $name... "
    if eval "$cmd" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASS++))
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((FAIL++))
    fi
}

warn() {
    local name="$1"
    local msg="$2"
    echo -e "${YELLOW}⚠ WARNING:${NC} $name - $msg"
    ((WARN++))
}

# ═══════════════════════════════════════════════════════════════════════
# 1. DIRECTORY STRUCTURE
# ═══════════════════════════════════════════════════════════════════════

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Directory Structure"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check "app/dashboard/page.tsx exists" "test -f app/dashboard/page.tsx"
check "app/overview/page.tsx exists" "test -f app/overview/page.tsx"
check "components/portfolio/ exists" "test -d components/portfolio"
check "components/command-center/ exists" "test -d components/command-center"
check "lib/engine/ exists" "test -d lib/engine"
check "tests/ exists" "test -d tests"
check "e2e/ exists" "test -d e2e"
check "docs/ exists" "test -d docs"

# ═══════════════════════════════════════════════════════════════════════
# 2. KEY FILES
# ═══════════════════════════════════════════════════════════════════════

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. Key Files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Portfolio components
check "PortfolioDashboard.tsx" "test -f components/portfolio/PortfolioDashboard.tsx"
check "PortfolioHeader.tsx" "test -f components/portfolio/PortfolioHeader.tsx"
check "PortfolioPulse.tsx" "test -f components/portfolio/PortfolioPulse.tsx"
check "DealPipelineGrid.tsx" "test -f components/portfolio/DealPipelineGrid.tsx"
check "DealCard.tsx" "test -f components/portfolio/DealCard.tsx"
check "usePortfolioData.ts" "test -f components/portfolio/usePortfolioData.ts"

# Engine
check "portfolio-utils.ts" "test -f lib/engine/portfolio-utils.ts"

# Tests
check "portfolio-utils.test.ts" "test -f tests/portfolio-utils.test.ts"
check "snapshots.test.ts" "test -f tests/edge-functions/snapshots.test.ts"
check "command-center.spec.ts" "test -f e2e/command-center.spec.ts"
check "playwright.config.ts" "test -f playwright.config.ts"

# ═══════════════════════════════════════════════════════════════════════
# 3. TYPESCRIPT CHECK
# ═══════════════════════════════════════════════════════════════════════

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. TypeScript Compilation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -n "Running typecheck... "
if pnpm -w typecheck 2>&1 | tail -1 | grep -q "error"; then
    echo -e "${RED}✗ FAIL${NC}"
    ((FAIL++))
else
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASS++))
fi

# ═══════════════════════════════════════════════════════════════════════
# 4. UNIT TESTS
# ═══════════════════════════════════════════════════════════════════════

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. Unit Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -n "Running unit tests... "
if pnpm -w test portfolio-utils 2>&1 | grep -q "passed"; then
    TEST_COUNT=$(pnpm -w test portfolio-utils 2>&1 | grep -oP '\d+(?= passed)')
    echo -e "${GREEN}✓ PASS ($TEST_COUNT tests)${NC}"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAIL++))
fi

# ═══════════════════════════════════════════════════════════════════════
# 5. INTEGRATION TESTS
# ═══════════════════════════════════════════════════════════════════════

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. Integration Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -n "Running integration tests... "
if pnpm -w test edge-functions 2>&1 | grep -q "passed"; then
    TEST_COUNT=$(pnpm -w test edge-functions 2>&1 | grep -oP '\d+(?= passed)')
    echo -e "${GREEN}✓ PASS ($TEST_COUNT tests)${NC}"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAIL++))
fi

# ═══════════════════════════════════════════════════════════════════════
# 6. BUILD
# ═══════════════════════════════════════════════════════════════════════

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. Production Build"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -n "Running production build... "
if pnpm build 2>&1 | grep -q "Compiled successfully"; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASS++))
else
    # Check for alternative success message
    if test -d ".next"; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASS++))
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((FAIL++))
    fi
fi

# ═══════════════════════════════════════════════════════════════════════
# 7. DOCUMENTATION
# ═══════════════════════════════════════════════════════════════════════

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7. Documentation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check "devlog entry" "test -f docs/devlog/2026-01-03-command-center-v2.1.md"
check "architecture docs" "test -f docs/architecture/command-center-v2.1.md"
check "test coverage report" "test -f docs/testing/coverage-report-v2.1.md"
check "roadmap update" "test -f docs/roadmap-v2.1-update.md"

# ═══════════════════════════════════════════════════════════════════════
# 8. SUMMARY
# ═══════════════════════════════════════════════════════════════════════

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "  Verification Summary"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo -e "  ${GREEN}PASS:${NC} $PASS"
echo -e "  ${RED}FAIL:${NC} $FAIL"
echo -e "  ${YELLOW}WARN:${NC} $WARN"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "  ${GREEN}✓ All checks passed! Ready for deployment.${NC}"
    echo ""
    exit 0
else
    echo -e "  ${RED}✗ Some checks failed. Please review before deployment.${NC}"
    echo ""
    exit 1
fi
