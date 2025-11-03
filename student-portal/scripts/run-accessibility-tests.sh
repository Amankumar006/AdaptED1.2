#!/bin/bash

# Student Portal Accessibility Test Runner
# This script runs all accessibility tests and generates a comprehensive report

set -e

echo "🎓 Starting Student Portal Accessibility Test Suite"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
UNIT_TESTS_PASSED=false
CYPRESS_TESTS_PASSED=false
PLAYWRIGHT_TESTS_PASSED=false
LIGHTHOUSE_TESTS_PASSED=false

# Create results directory
mkdir -p test-results/accessibility

echo -e "${BLUE}📋 Running Unit Tests with Accessibility Checks${NC}"
echo "------------------------------------------------"
if npm run test:a11y; then
    echo -e "${GREEN}✅ Unit accessibility tests passed${NC}"
    UNIT_TESTS_PASSED=true
else
    echo -e "${RED}❌ Unit accessibility tests failed${NC}"
fi

echo -e "\n${BLUE}🔧 Building Application${NC}"
echo "----------------------"
npm run build

echo -e "\n${BLUE}🚀 Starting Application for E2E Tests${NC}"
echo "-------------------------------------"
npm run preview &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
npx wait-on http://localhost:4173 --timeout 30000

echo -e "\n${BLUE}🌐 Running Cypress Accessibility Tests${NC}"
echo "--------------------------------------"
if npm run cypress:accessibility; then
    echo -e "${GREEN}✅ Cypress accessibility tests passed${NC}"
    CYPRESS_TESTS_PASSED=true
else
    echo -e "${RED}❌ Cypress accessibility tests failed${NC}"
fi

echo -e "\n${BLUE}🎭 Running Playwright Cross-Browser Tests${NC}"
echo "----------------------------------------"
npx playwright install --with-deps
if npm run playwright:cross-browser; then
    echo -e "${GREEN}✅ Playwright cross-browser tests passed${NC}"
    PLAYWRIGHT_TESTS_PASSED=true
else
    echo -e "${RED}❌ Playwright cross-browser tests failed${NC}"
fi

echo -e "\n${BLUE}💡 Running Lighthouse Accessibility Audit${NC}"
echo "----------------------------------------"
if npm run lighthouse; then
    echo -e "${GREEN}✅ Lighthouse accessibility audit passed${NC}"
    LIGHTHOUSE_TESTS_PASSED=true
else
    echo -e "${RED}❌ Lighthouse accessibility audit failed${NC}"
fi

echo -e "\n${BLUE}⚡ Running Performance Tests${NC}"
echo "----------------------------"
npm run performance

echo -e "\n${BLUE}📱 Running Offline Synchronization Tests${NC}"
echo "----------------------------------------"
npm run cypress:offline

# Stop the server
kill $SERVER_PID

echo -e "\n${BLUE}📊 Generating Accessibility Report${NC}"
echo "==================================="

# Create HTML report
cat > test-results/accessibility/report.html << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Student Portal Accessibility Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f8ff; padding: 20px; border-radius: 8px; }
        .test-section { margin: 20px 0; padding: 15px; border-left: 4px solid #007acc; }
        .passed { border-left-color: #28a745; }
        .failed { border-left-color: #dc3545; }
        .status { font-weight: bold; }
        .passed .status { color: #28a745; }
        .failed .status { color: #dc3545; }
        .summary { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎓 Student Portal Accessibility Test Report</h1>
        <p>Generated on: $(date)</p>
    </div>

    <div class="summary">
        <h2>Test Summary</h2>
        <ul>
            <li>Unit Tests with Accessibility Checks: $([ "$UNIT_TESTS_PASSED" = true ] && echo "✅ PASSED" || echo "❌ FAILED")</li>
            <li>Cypress E2E Accessibility Tests: $([ "$CYPRESS_TESTS_PASSED" = true ] && echo "✅ PASSED" || echo "❌ FAILED")</li>
            <li>Playwright Cross-Browser Tests: $([ "$PLAYWRIGHT_TESTS_PASSED" = true ] && echo "✅ PASSED" || echo "❌ FAILED")</li>
            <li>Lighthouse Accessibility Audit: $([ "$LIGHTHOUSE_TESTS_PASSED" = true ] && echo "✅ PASSED" || echo "❌ FAILED")</li>
        </ul>
    </div>

    <div class="test-section $([ "$UNIT_TESTS_PASSED" = true ] && echo "passed" || echo "failed")">
        <h3>Unit Tests with Accessibility Checks</h3>
        <p class="status">$([ "$UNIT_TESTS_PASSED" = true ] && echo "PASSED" || echo "FAILED")</p>
        <p>Tests individual components for WCAG 2.1 AA compliance using vitest-axe.</p>
        <ul>
            <li>AdaptiveDashboard accessibility</li>
            <li>InteractiveLessonViewer accessibility</li>
            <li>BuddyAIChat accessibility</li>
            <li>PracticeSession accessibility</li>
            <li>StudyGroupManager accessibility</li>
        </ul>
    </div>

    <div class="test-section $([ "$CYPRESS_TESTS_PASSED" = true ] && echo "passed" || echo "failed")">
        <h3>Cypress E2E Accessibility Tests</h3>
        <p class="status">$([ "$CYPRESS_TESTS_PASSED" = true ] && echo "PASSED" || echo "FAILED")</p>
        <p>End-to-end accessibility testing of complete user workflows.</p>
        <ul>
            <li>Learning workflow accessibility</li>
            <li>Navigation and keyboard support</li>
            <li>Screen reader compatibility</li>
            <li>High contrast mode support</li>
        </ul>
    </div>

    <div class="test-section $([ "$PLAYWRIGHT_TESTS_PASSED" = true ] && echo "passed" || echo "failed")">
        <h3>Playwright Cross-Browser Tests</h3>
        <p class="status">$([ "$PLAYWRIGHT_TESTS_PASSED" = true ] && echo "PASSED" || echo "FAILED")</p>
        <p>Cross-browser compatibility and accessibility testing.</p>
        <ul>
            <li>Chrome, Firefox, Safari compatibility</li>
            <li>Mobile browser support</li>
            <li>Responsive design accessibility</li>
            <li>Touch interaction support</li>
        </ul>
    </div>

    <div class="test-section $([ "$LIGHTHOUSE_TESTS_PASSED" = true ] && echo "passed" || echo "failed")">
        <h3>Lighthouse Accessibility Audit</h3>
        <p class="status">$([ "$LIGHTHOUSE_TESTS_PASSED" = true ] && echo "PASSED" || echo "FAILED")</p>
        <p>Automated accessibility audit using Google Lighthouse.</p>
        <ul>
            <li>WCAG 2.1 AA compliance check</li>
            <li>Color contrast validation</li>
            <li>Keyboard navigation audit</li>
            <li>Screen reader compatibility</li>
        </ul>
    </div>

    <div class="summary">
        <h2>Recommendations</h2>
        <ul>
            <li>Run accessibility tests on every pull request</li>
            <li>Test with actual assistive technologies</li>
            <li>Include users with disabilities in testing</li>
            <li>Monitor Core Web Vitals for performance accessibility</li>
            <li>Regular accessibility audits with third-party tools</li>
        </ul>
    </div>
</body>
</html>
EOF

echo -e "\n${GREEN}📋 Test Results Summary${NC}"
echo "======================="
echo -e "Unit Tests: $([ "$UNIT_TESTS_PASSED" = true ] && echo -e "${GREEN}✅ PASSED${NC}" || echo -e "${RED}❌ FAILED${NC}")"
echo -e "Cypress Tests: $([ "$CYPRESS_TESTS_PASSED" = true ] && echo -e "${GREEN}✅ PASSED${NC}" || echo -e "${RED}❌ FAILED${NC}")"
echo -e "Playwright Tests: $([ "$PLAYWRIGHT_TESTS_PASSED" = true ] && echo -e "${GREEN}✅ PASSED${NC}" || echo -e "${RED}❌ FAILED${NC}")"
echo -e "Lighthouse Audit: $([ "$LIGHTHOUSE_TESTS_PASSED" = true ] && echo -e "${GREEN}✅ PASSED${NC}" || echo -e "${RED}❌ FAILED${NC}")"

echo -e "\n${BLUE}📄 Report generated: test-results/accessibility/report.html${NC}"

# Exit with error if any tests failed
if [ "$UNIT_TESTS_PASSED" = true ] && [ "$CYPRESS_TESTS_PASSED" = true ] && [ "$PLAYWRIGHT_TESTS_PASSED" = true ] && [ "$LIGHTHOUSE_TESTS_PASSED" = true ]; then
    echo -e "\n${GREEN}🎉 All accessibility tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some accessibility tests failed. Please review the results.${NC}"
    exit 1
fi