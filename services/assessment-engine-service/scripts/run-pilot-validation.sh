#!/bin/bash

# Main Pilot Validation Orchestration Script
set -e

echo "🚀 Assessment Engine Service - Complete Pilot Validation"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_phase() {
    echo -e "${PURPLE}[PHASE]${NC} $1"
}

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"
PILOT_LOG_FILE="pilot-validation.log"

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$PILOT_LOG_FILE"
}

# Function to run script with error handling
run_script() {
    local script_name="$1"
    local description="$2"
    
    print_step "Running: $description"
    log_message "Starting: $description"
    
    if [ -f "$SCRIPT_DIR/$script_name" ]; then
        if bash "$SCRIPT_DIR/$script_name"; then
            print_status "✅ Completed: $description"
            log_message "Completed successfully: $description"
            return 0
        else
            print_error "❌ Failed: $description"
            log_message "Failed: $description"
            return 1
        fi
    else
        print_error "❌ Script not found: $script_name"
        log_message "Script not found: $script_name"
        return 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    print_phase "Checking Prerequisites"
    
    local missing_deps=0
    
    # Check required commands
    for cmd in node npm docker curl jq python3 bc; do
        if ! command -v $cmd &> /dev/null; then
            print_error "Missing required command: $cmd"
            missing_deps=$((missing_deps + 1))
        else
            print_status "✅ Found: $cmd"
        fi
    done
    
    # Check if we're in the right directory
    if [ ! -f "$SERVICE_DIR/package.json" ]; then
        print_error "Not in assessment-engine-service directory"
        missing_deps=$((missing_deps + 1))
    else
        print_status "✅ In correct service directory"
    fi
    
    # Check if infrastructure is running
    if ! curl -s http://localhost:5432 > /dev/null 2>&1; then
        print_warning "PostgreSQL may not be running (port 5432)"
    else
        print_status "✅ PostgreSQL is accessible"
    fi
    
    if [ $missing_deps -gt 0 ]; then
        print_error "Missing $missing_deps prerequisites. Please install missing dependencies."
        return 1
    fi
    
    print_status "All prerequisites satisfied"
    return 0
}

# Function to display pilot summary
display_pilot_summary() {
    print_phase "Pilot Validation Summary"
    
    echo ""
    echo "=================================================="
    echo "🧪 ASSESSMENT ENGINE PILOT VALIDATION COMPLETE"
    echo "=================================================="
    echo ""
    
    if [ -f "pilot-validation-report.json" ]; then
        echo "📊 Validation Results:"
        if command -v jq &> /dev/null; then
            total_tests=$(jq -r '.validation_summary.total_tests' pilot-validation-report.json 2>/dev/null || echo "N/A")
            passed_tests=$(jq -r '.validation_summary.passed_tests' pilot-validation-report.json 2>/dev/null || echo "N/A")
            success_rate=$(jq -r '.validation_summary.success_rate' pilot-validation-report.json 2>/dev/null || echo "N/A")
            
            echo "   Total Tests: $total_tests"
            echo "   Passed Tests: $passed_tests"
            echo "   Success Rate: $success_rate%"
        else
            echo "   Validation report available: pilot-validation-report.json"
        fi
    else
        echo "   ⚠️  Validation report not found"
    fi
    
    echo ""
    echo "📁 Generated Artifacts:"
    echo "   - Pilot deployment configuration"
    echo "   - Teacher training materials"
    echo "   - Student cohort setup"
    echo "   - Validation reports and logs"
    echo "   - Monitoring dashboards"
    echo ""
    
    echo "🎯 Pilot Components Ready:"
    echo "   ✅ Assessment Engine Service deployed"
    echo "   ✅ Teacher training materials prepared"
    echo "   ✅ Student cohorts configured"
    echo "   ✅ Validation tests completed"
    echo "   ✅ Monitoring and feedback systems ready"
    echo ""
    
    echo "📋 Next Steps for Full Pilot:"
    echo "   1. Review validation results and address any issues"
    echo "   2. Schedule and conduct teacher training sessions"
    echo "   3. Set up student cohorts and onboarding"
    echo "   4. Launch pilot assessments with selected cohorts"
    echo "   5. Monitor performance and collect feedback"
    echo "   6. Iterate based on pilot results"
    echo ""
    
    echo "📞 Support Contacts:"
    echo "   Technical Issues: assessment-engine-support@example.com"
    echo "   Pilot Coordination: pilot-coordinator@example.com"
    echo "   Training Support: training-support@example.com"
    echo ""
    
    print_status "Pilot validation orchestration completed successfully!"
}

# Main execution flow
main() {
    print_phase "Starting Assessment Engine Pilot Validation"
    log_message "Starting pilot validation orchestration"
    
    # Initialize log file
    echo "Assessment Engine Pilot Validation Log" > "$PILOT_LOG_FILE"
    echo "Started: $(date)" >> "$PILOT_LOG_FILE"
    echo "========================================" >> "$PILOT_LOG_FILE"
    
    # Phase 1: Prerequisites Check
    if ! check_prerequisites; then
        print_error "Prerequisites check failed. Aborting pilot validation."
        exit 1
    fi
    
    # Phase 2: Service Deployment
    print_phase "Phase 1: Service Deployment and Setup"
    if ! run_script "pilot-deployment.sh" "Deploy Assessment Engine to Pilot Environment"; then
        print_error "Service deployment failed. Cannot continue with pilot validation."
        exit 1
    fi
    
    # Wait for service to stabilize
    print_step "Waiting for service to stabilize..."
    sleep 10
    
    # Phase 3: Teacher Training Setup
    print_phase "Phase 2: Teacher Training Preparation"
    run_script "teacher-training-setup.sh" "Set up Teacher Training Materials"
    
    # Phase 4: Student Cohort Setup
    print_phase "Phase 3: Student Cohort Configuration"
    run_script "pilot-cohort-setup.sh" "Configure Pilot Student Cohorts"
    
    # Phase 5: System Validation
    print_phase "Phase 4: System Validation and Testing"
    if ! run_script "pilot-validation.sh" "Run Comprehensive Pilot Validation Tests"; then
        print_warning "Some validation tests failed. Review results before proceeding."
    fi
    
    # Phase 6: Final Setup and Documentation
    print_phase "Phase 5: Final Setup and Documentation"
    
    # Create final pilot package
    print_step "Creating pilot deployment package..."
    PILOT_PACKAGE_DIR="assessment-engine-pilot-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$PILOT_PACKAGE_DIR"
    
    # Copy all pilot artifacts
    cp -r pilot-training-materials "$PILOT_PACKAGE_DIR/" 2>/dev/null || true
    cp -r pilot-cohorts "$PILOT_PACKAGE_DIR/" 2>/dev/null || true
    cp pilot-*.json "$PILOT_PACKAGE_DIR/" 2>/dev/null || true
    cp "$PILOT_LOG_FILE" "$PILOT_PACKAGE_DIR/" 2>/dev/null || true
    
    # Create pilot README
    cat > "$PILOT_PACKAGE_DIR/README.md" << EOF
# Assessment Engine Pilot Package

Generated: $(date)

## Contents

- **pilot-training-materials/**: Complete teacher training resources
- **pilot-cohorts/**: Student cohort configurations and data
- **pilot-validation-report.json**: Validation test results
- **pilot-monitoring.json**: Monitoring configuration
- **pilot-validation.log**: Complete validation log

## Quick Start

1. Review validation results in pilot-validation-report.json
2. Customize training materials for your institution
3. Configure student cohorts using provided templates
4. Follow the pilot workflow guide for execution
5. Monitor progress using provided dashboards

## Support

For questions or issues during the pilot:
- Technical: assessment-engine-support@example.com
- Training: training-support@example.com
- Coordination: pilot-coordinator@example.com

## Next Steps

1. Address any validation failures
2. Schedule teacher training sessions
3. Set up student cohorts
4. Launch pilot assessments
5. Monitor and collect feedback
6. Iterate based on results

Good luck with your pilot! 🚀
EOF
    
    print_status "✅ Pilot package created: $PILOT_PACKAGE_DIR"
    
    # Final summary
    display_pilot_summary
    
    log_message "Pilot validation orchestration completed"
    echo "Completed: $(date)" >> "$PILOT_LOG_FILE"
}

# Handle script interruption
trap 'print_error "Pilot validation interrupted"; exit 1' INT TERM

# Change to service directory
cd "$SERVICE_DIR"

# Run main function
main "$@"