#!/bin/bash

# Quick System Test Runner
# Runs a simplified system integration test

set -e

echo "🚀 Quick System Integration Test"
echo "==============================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default parameters
DURATION=60
USERS=10
BASE_URL="http://localhost:3000"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --duration)
      DURATION="$2"
      shift 2
      ;;
    --users)
      USERS="$2"
      shift 2
      ;;
    --url)
      BASE_URL="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo "Options:"
      echo "  --duration SECONDS   Test duration in seconds (default: 60)"
      echo "  --users NUM         Number of concurrent users (default: 10)"
      echo "  --url URL           Base URL (default: http://localhost:3000)"
      echo "  --help              Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

echo "Parameters:"
echo "  Duration: ${DURATION}s"
echo "  Users: $USERS"
echo "  Base URL: $BASE_URL"
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

# Create results directory
mkdir -p tests/integration/results

# Run the quick test
echo "🧪 Running quick system test..."
cd tests/integration

if node quick-system-test.js --duration $DURATION --users $USERS --url $BASE_URL; then
    echo -e "\n${GREEN}🎉 Quick System Test PASSED${NC}"
    
    # Show results if jq is available
    if command -v jq &> /dev/null && [ -f "results/quick-system-test-report.json" ]; then
        echo -e "\n📊 Key Metrics:"
        echo "==============="
        
        local success_rate=$(jq -r '.overallSuccessRate' results/quick-system-test-report.json)
        local duration=$(jq -r '.duration' results/quick-system-test-report.json)
        local tests_passed=$(jq -r '.summary.passedTests' results/quick-system-test-report.json)
        local total_tests=$(jq -r '.summary.totalTests' results/quick-system-test-report.json)
        
        echo "Overall Success Rate: ${success_rate}%"
        echo "Test Duration: $((duration / 1000))s"
        echo "Tests Passed: ${tests_passed}/${total_tests}"
    fi
    
    exit 0
else
    echo -e "\n${RED}❌ Quick System Test FAILED${NC}"
    exit 1
fi