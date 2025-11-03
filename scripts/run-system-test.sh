#!/bin/bash

# Real-Time System Integration Test Runner
# Starts all services and runs comprehensive system tests

set -e

echo "🚀 Real-Time System Integration Test Suite"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default test parameters
CONCURRENT_USERS=50
TEST_DURATION=900  # 15 minutes in seconds
BASE_URL="http://localhost:3000"
TEACHER_URL="http://localhost:3001"
SERVICES_HEALTH_CHECK=true
CLEANUP_AFTER_TEST=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --users)
      CONCURRENT_USERS="$2"
      shift 2
      ;;
    --duration)
      TEST_DURATION="$2"
      shift 2
      ;;
    --url)
      BASE_URL="$2"
      shift 2
      ;;
    --no-health-check)
      SERVICES_HEALTH_CHECK=false
      shift
      ;;
    --no-cleanup)
      CLEANUP_AFTER_TEST=false
      shift
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo "Options:"
      echo "  --users NUM          Number of concurrent users (default: 50)"
      echo "  --duration SECONDS   Test duration in seconds (default: 900)"
      echo "  --url URL           Base URL for student portal (default: http://localhost:3000)"
      echo "  --no-health-check   Skip service health checks"
      echo "  --no-cleanup        Don't cleanup after test"
      echo "  --help              Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

# Function to check if service is running
check_service() {
    local service_name=$1
    local port=$2
    local endpoint=${3:-"/health"}
    
    if curl -s "http://localhost:$port$endpoint" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $service_name is running on port $port${NC}"
        return 0
    else
        echo -e "${RED}❌ $service_name is not running on port $port${NC}"
        return 1
    fi
}

# Function to start services if needed
start_services() {
    echo "🔧 Checking and starting required services..."
    
    local services_to_start=()
    
    # Check core services
    if ! check_service "Student Portal" 3000 "/"; then
        services_to_start+=("student-portal")
    fi
    
    if ! check_service "Teacher Portal" 3001 "/"; then
        services_to_start+=("teacher-portal")
    fi
    
    # Check backend services (assuming they run on different ports)
    if ! check_service "Auth Service" 8001; then
        services_to_start+=("auth-service")
    fi
    
    if ! check_service "Content Service" 8002; then
        services_to_start+=("content-service")
    fi
    
    if ! check_service "Assessment Service" 8003; then
        services_to_start+=("assessment-service")
    fi
    
    if ! check_service "Analytics Service" 8004; then
        services_to_start+=("analytics-service")
    fi
    
    if ! check_service "AI Service" 8005; then
        services_to_start+=("ai-service")
    fi
    
    # Start missing services
    if [ ${#services_to_start[@]} -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Some services are not running. Starting them...${NC}"
        
        for service in "${services_to_start[@]}"; do
            echo "Starting $service..."
            case $service in
                "student-portal")
                    cd student-portal && npm run dev &
                    STUDENT_PORTAL_PID=$!
                    cd ..
                    ;;
                "teacher-portal")
                    cd teacher-portal && npm run dev &
                    TEACHER_PORTAL_PID=$!
                    cd ..
                    ;;
                *)
                    echo "Service startup for $service not implemented in this script"
                    ;;
            esac
        done
        
        # Wait for services to start
        echo "Waiting for services to start..."
        sleep 30
        
        # Verify services started
        for service in "${services_to_start[@]}"; do
            case $service in
                "student-portal")
                    check_service "Student Portal" 3000 "/"
                    ;;
                "teacher-portal")
                    check_service "Teacher Portal" 3001 "/"
                    ;;
            esac
        done
    else
        echo -e "${GREEN}✅ All required services are running${NC}"
    fi
}

# Function to run pre-test validation
run_pre_test_validation() {
    echo "🔍 Running pre-test validation..."
    
    # Test basic connectivity
    echo "Testing basic connectivity..."
    
    if curl -s "$BASE_URL" > /dev/null; then
        echo -e "${GREEN}✅ Student portal accessible${NC}"
    else
        echo -e "${RED}❌ Student portal not accessible at $BASE_URL${NC}"
        exit 1
    fi
    
    if curl -s "$TEACHER_URL" > /dev/null; then
        echo -e "${GREEN}✅ Teacher portal accessible${NC}"
    else
        echo -e "${YELLOW}⚠️  Teacher portal not accessible at $TEACHER_URL${NC}"
    fi
    
    # Check if test dependencies are installed
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        exit 1
    fi
    
    # Install test dependencies if needed
    if [ ! -d "tests/integration/node_modules" ]; then
        echo "Installing test dependencies..."
        cd tests/integration
        npm init -y > /dev/null 2>&1
        npm install playwright > /dev/null 2>&1
        cd ../..
    fi
    
    echo -e "${GREEN}✅ Pre-test validation complete${NC}"
}

# Function to run the actual system test
run_system_test() {
    echo "🧪 Starting real-time system integration test..."
    echo "Parameters:"
    echo "  Concurrent Users: $CONCURRENT_USERS"
    echo "  Test Duration: ${TEST_DURATION}s"
    echo "  Base URL: $BASE_URL"
    echo ""
    
    cd tests/integration
    
    # Run the system test
    node real-time-system-test.js \
        --users $CONCURRENT_USERS \
        --duration $TEST_DURATION \
        --url $BASE_URL
    
    local test_exit_code=$?
    cd ../..
    
    return $test_exit_code
}

# Function to collect and analyze results
analyze_results() {
    echo "📊 Analyzing test results..."
    
    if [ -f "tests/integration/results/real-time-system-test-report.json" ]; then
        # Extract key metrics from the report
        local report_file="tests/integration/results/real-time-system-test-report.json"
        
        echo "📋 Test Summary:"
        echo "==============="
        
        # Use jq if available, otherwise use basic parsing
        if command -v jq &> /dev/null; then
            local success_rate=$(jq -r '.systemMetrics.successRate' "$report_file")
            local avg_response_time=$(jq -r '.systemMetrics.averageResponseTime' "$report_file")
            local total_users=$(jq -r '.summary.totalUsers' "$report_file")
            local user_success_rate=$(jq -r '.summary.userSuccessRate' "$report_file")
            
            echo "Success Rate: ${success_rate}%"
            echo "Average Response Time: ${avg_response_time}ms"
            echo "Total Users: $total_users"
            echo "User Success Rate: ${user_success_rate}%"
        else
            echo "Report generated at: $report_file"
            echo "Install 'jq' for detailed metric extraction"
        fi
        
        # Copy report to timestamped file
        local timestamp=$(date +"%Y%m%d_%H%M%S")
        cp "$report_file" "tests/integration/results/system-test-$timestamp.json"
        
        echo -e "${GREEN}✅ Results saved to: tests/integration/results/system-test-$timestamp.json${NC}"
    else
        echo -e "${RED}❌ Test report not found${NC}"
        return 1
    fi
}

# Function to cleanup after test
cleanup() {
    if [ "$CLEANUP_AFTER_TEST" = true ]; then
        echo "🧹 Cleaning up..."
        
        # Kill services we started
        if [ ! -z "$STUDENT_PORTAL_PID" ]; then
            kill $STUDENT_PORTAL_PID 2>/dev/null || true
            echo "Stopped student portal"
        fi
        
        if [ ! -z "$TEACHER_PORTAL_PID" ]; then
            kill $TEACHER_PORTAL_PID 2>/dev/null || true
            echo "Stopped teacher portal"
        fi
        
        echo -e "${GREEN}✅ Cleanup complete${NC}"
    fi
}

# Trap cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    echo "🎯 Real-Time System Integration Test"
    echo "Concurrent Users: $CONCURRENT_USERS"
    echo "Test Duration: ${TEST_DURATION}s"
    echo "Base URL: $BASE_URL"
    echo "=================================="
    
    # Check and start services if needed
    if [ "$SERVICES_HEALTH_CHECK" = true ]; then
        start_services
    fi
    
    # Run pre-test validation
    run_pre_test_validation
    
    # Run the system test
    if run_system_test; then
        echo -e "\n${GREEN}🎉 System test completed successfully${NC}"
        
        # Analyze results
        analyze_results
        
        echo -e "\n${GREEN}✅ Real-Time System Integration Test PASSED${NC}"
        exit 0
    else
        echo -e "\n${RED}❌ System test failed${NC}"
        
        # Still try to analyze results for debugging
        analyze_results
        
        echo -e "\n${RED}❌ Real-Time System Integration Test FAILED${NC}"
        exit 1
    fi
}

# Run main function
main "$@"