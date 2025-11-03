#!/bin/bash

# Video Performance Validation Script
# Validates video loading and playback performance across different conditions
# Target: Video start time ≤ 3s

set -e

echo "🎥 Starting Video Performance Validation Suite..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create results directory
mkdir -p tests/performance/results

# Function to check if service is running
check_service() {
    local service_name=$1
    local port=$2
    
    if curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $service_name is running${NC}"
        return 0
    else
        echo -e "${RED}❌ $service_name is not running on port $port${NC}"
        return 1
    fi
}

# Function to start test server if needed
start_test_server() {
    echo "🚀 Starting test server for video performance tests..."
    
    # Copy test page to student portal public directory
    cp tests/performance/video-test-page.html student-portal/public/video-test.html
    
    # Start student portal if not running
    if ! check_service "Student Portal" 3000; then
        echo "Starting Student Portal..."
        cd student-portal
        npm run dev &
        STUDENT_PORTAL_PID=$!
        cd ..
        
        # Wait for service to start
        echo "Waiting for Student Portal to start..."
        for i in {1..30}; do
            if check_service "Student Portal" 3000; then
                break
            fi
            sleep 2
        done
    fi
}

# Function to run video performance tests
run_video_tests() {
    echo "📊 Running video performance validation tests..."
    
    # Run the video performance validator
    node tests/performance/video-performance-validation.js
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ Video performance tests passed${NC}"
    else
        echo -e "${RED}❌ Video performance tests failed${NC}"
    fi
    
    return $exit_code
}

# Function to test CDN optimization
test_cdn_optimization() {
    echo "🌐 Testing CDN optimization and caching..."
    
    # Test video request headers and caching
    local test_url="http://localhost:3000/video-test.html"
    
    echo "Testing video request optimization..."
    
    # First request (should be cache miss)
    local first_response=$(curl -s -w "%{http_code},%{time_total},%{size_download}" -o /dev/null "$test_url")
    
    # Second request (should be faster due to caching)
    local second_response=$(curl -s -w "%{http_code},%{time_total},%{size_download}" -o /dev/null "$test_url")
    
    echo "First request: $first_response"
    echo "Second request: $second_response"
    
    # Parse response times
    local first_time=$(echo $first_response | cut -d',' -f2)
    local second_time=$(echo $second_response | cut -d',' -f2)
    
    # Check if second request is faster (indicating caching)
    if (( $(echo "$second_time < $first_time" | bc -l) )); then
        echo -e "${GREEN}✅ CDN caching appears to be working${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  CDN caching may not be optimized${NC}"
        return 1
    fi
}

# Function to test adaptive bitrate streaming
test_adaptive_streaming() {
    echo "📱 Testing adaptive bitrate streaming..."
    
    # Use curl to test HLS manifest availability
    local hls_endpoints=(
        "http://localhost:3000/api/content/video/sample.m3u8"
        "http://localhost:3000/api/content/video/playlist.m3u8"
    )
    
    local adaptive_working=false
    
    for endpoint in "${hls_endpoints[@]}"; do
        if curl -s --head "$endpoint" | grep -q "200 OK"; then
            echo -e "${GREEN}✅ HLS endpoint available: $endpoint${NC}"
            adaptive_working=true
        else
            echo -e "${YELLOW}⚠️  HLS endpoint not available: $endpoint${NC}"
        fi
    done
    
    if [ "$adaptive_working" = true ]; then
        echo -e "${GREEN}✅ Adaptive streaming endpoints are available${NC}"
        return 0
    else
        echo -e "${RED}❌ No adaptive streaming endpoints found${NC}"
        return 1
    fi
}

# Function to generate performance report
generate_report() {
    echo "📋 Generating video performance report..."
    
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local report_file="tests/performance/results/video-performance-report-$timestamp.json"
    
    # Check if detailed report exists
    if [ -f "tests/performance/video-performance-report.json" ]; then
        cp "tests/performance/video-performance-report.json" "$report_file"
        echo -e "${GREEN}✅ Detailed performance report saved to: $report_file${NC}"
    fi
    
    # Create summary report
    cat > "tests/performance/results/video-validation-summary.json" << EOF
{
  "testSuite": "Video Performance Validation",
  "timestamp": "$timestamp",
  "target": "Video start time ≤ 3s",
  "phase": "Phase Gate B Validation",
  "status": "$1",
  "requirements": ["2.2", "12.1", "15.2"],
  "testResults": {
    "videoPerformance": "$2",
    "cdnOptimization": "$3",
    "adaptiveStreaming": "$4"
  }
}
EOF
    
    echo -e "${BLUE}📊 Summary report saved to: tests/performance/results/video-validation-summary.json${NC}"
}

# Function to cleanup
cleanup() {
    echo "🧹 Cleaning up..."
    
    # Kill student portal if we started it
    if [ ! -z "$STUDENT_PORTAL_PID" ]; then
        kill $STUDENT_PORTAL_PID 2>/dev/null || true
    fi
    
    # Remove test files
    rm -f student-portal/public/video-test.html
}

# Trap cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    echo "🎯 Video Performance Validation - Phase Gate B"
    echo "Target: Video start time ≤ 3 seconds"
    echo "=========================================="
    
    # Start test server
    start_test_server
    
    # Initialize test results
    local video_tests="FAILED"
    local cdn_tests="FAILED"
    local adaptive_tests="FAILED"
    local overall_status="FAILED"
    
    # Run video performance tests
    if run_video_tests; then
        video_tests="PASSED"
    fi
    
    # Test CDN optimization
    if test_cdn_optimization; then
        cdn_tests="PASSED"
    fi
    
    # Test adaptive streaming
    if test_adaptive_streaming; then
        adaptive_tests="PASSED"
    fi
    
    # Determine overall status
    if [ "$video_tests" = "PASSED" ]; then
        overall_status="PASSED"
        echo -e "\n${GREEN}🎉 Video Performance Validation PASSED${NC}"
        echo -e "${GREEN}✅ Phase Gate B video criteria met${NC}"
    else
        echo -e "\n${RED}❌ Video Performance Validation FAILED${NC}"
        echo -e "${RED}❌ Phase Gate B video criteria not met${NC}"
    fi
    
    # Generate reports
    generate_report "$overall_status" "$video_tests" "$cdn_tests" "$adaptive_tests"
    
    # Print summary
    echo -e "\n📊 Test Summary:"
    echo -e "Video Performance: $video_tests"
    echo -e "CDN Optimization: $cdn_tests"
    echo -e "Adaptive Streaming: $adaptive_tests"
    echo -e "Overall Status: $overall_status"
    
    # Exit with appropriate code
    if [ "$overall_status" = "PASSED" ]; then
        exit 0
    else
        exit 1
    fi
}

# Run main function
main "$@"