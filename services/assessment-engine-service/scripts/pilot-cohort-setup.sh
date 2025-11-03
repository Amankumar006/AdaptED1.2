#!/bin/bash

# Assessment Engine Service - Pilot Cohort Setup Script
set -e

echo "🎯 Setting up Assessment Engine Pilot Cohorts"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Configuration
PILOT_DIR="pilot-cohorts"
TRAINING_DIR="pilot-training-materials"
SERVICE_PORT=3003
BASE_URL="http://localhost:${SERVICE_PORT}"

# Verify pilot cohort files exist
verify_pilot_files() {
    print_step "Verifying pilot configuration files..."
    
    local required_files=(
        "${PILOT_DIR}/cohort-config.json"
        "${PILOT_DIR}/pilot-students.json"
        "${PILOT_DIR}/pilot-teachers.json"
        "${PILOT_DIR}/pilot-assessments.json"
        "${PILOT_DIR}/pilot-monitoring.json"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            print_error "Required file not found: $file"
            exit 1
        else
            print_status "✅ Found: $file"
        fi
    done
    
    print_status "All pilot configuration files verified"
}

# Verify training materials exist
verify_training_materials() {
    print_step "Verifying training materials..."
    
    local required_materials=(
        "${TRAINING_DIR}/teacher-quick-start-guide.md"
        "${TRAINING_DIR}/teacher-training-checklist.md"
        "${TRAINING_DIR}/student-onboarding-guide.md"
        "${TRAINING_DIR}/pilot-feedback-system.md"
        "${TRAINING_DIR}/training-schedule-template.md"
    )
    
    for material in "${required_materials[@]}"; do
        if [ ! -f "$material" ]; then
            print_error "Required training material not found: $material"
            exit 1
        else
            print_status "✅ Found: $material"
        fi
    done
    
    print_status "All training materials verified"
}

# Load and validate cohort configuration
load_cohort_config() {
    print_step "Loading cohort configuration..."
    
    if ! command -v jq &> /dev/null; then
        print_error "jq is required but not installed. Please install jq to continue."
        exit 1
    fi
    
    # Validate JSON files
    local json_files=(
        "${PILOT_DIR}/cohort-config.json"
        "${PILOT_DIR}/pilot-students.json"
        "${PILOT_DIR}/pilot-teachers.json"
        "${PILOT_DIR}/pilot-assessments.json"
        "${PILOT_DIR}/pilot-monitoring.json"
    )
    
    for json_file in "${json_files[@]}"; do
        if ! jq empty "$json_file" 2>/dev/null; then
            print_error "Invalid JSON in file: $json_file"
            exit 1
        else
            print_status "✅ Valid JSON: $json_file"
        fi
    done
    
    # Extract key configuration values
    TOTAL_STUDENTS=$(jq -r '.pilot_students.total_count' "${PILOT_DIR}/pilot-students.json")
    TOTAL_TEACHERS=$(jq -r '.pilot_teachers.total_count' "${PILOT_DIR}/pilot-teachers.json")
    TOTAL_ASSESSMENTS=$(jq -r '.pilot_assessments.total_count' "${PILOT_DIR}/pilot-assessments.json")
    PILOT_DURATION=$(jq -r '.pilot_program.duration_days' "${PILOT_DIR}/cohort-config.json")
    
    print_status "Pilot Configuration Summary:"
    print_status "  - Students: $TOTAL_STUDENTS"
    print_status "  - Teachers: $TOTAL_TEACHERS"
    print_status "  - Assessments: $TOTAL_ASSESSMENTS"
    print_status "  - Duration: $PILOT_DURATION days"
}

# Create pilot database schema (if needed)
setup_pilot_database() {
    print_step "Setting up pilot database schema..."
    
    # Check if database initialization is needed
    if [ "$PILOT_MODE" = "true" ]; then
        print_status "Running in pilot mode - using simplified schema"
        
        # Create pilot data directory
        mkdir -p data/pilot
        
        # Initialize pilot data files
        echo "[]" > data/pilot/question_banks.json
        echo "[]" > data/pilot/questions.json
        echo "[]" > data/pilot/assessments.json
        echo "[]" > data/pilot/submissions.json
        
        print_status "✅ Pilot data storage initialized"
    else
        print_warning "Not in pilot mode - database setup may be required"
    fi
}

# Generate pilot user accounts
generate_pilot_accounts() {
    print_step "Generating pilot user accounts..."
    
    # Create accounts directory
    mkdir -p data/pilot/accounts
    
    # Generate teacher accounts
    print_status "Generating teacher accounts..."
    jq -r '.teachers[] | "\(.id),\(.profile.email),\(.profile.first_name),\(.profile.last_name)"' \
        "${PILOT_DIR}/pilot-teachers.json" > data/pilot/accounts/teachers.csv
    
    # Generate student accounts
    print_status "Generating student accounts..."
    jq -r '.students[] | "\(.id),\(.profile.first_name),\(.profile.last_name),\(.cohort_id)"' \
        "${PILOT_DIR}/pilot-students.json" > data/pilot/accounts/students.csv
    
    print_status "✅ Pilot accounts generated"
    print_status "  - Teacher accounts: data/pilot/accounts/teachers.csv"
    print_status "  - Student accounts: data/pilot/accounts/students.csv"
}

# Create pilot assessment templates
create_assessment_templates() {
    print_step "Creating pilot assessment templates..."
    
    mkdir -p data/pilot/templates
    
    # Extract assessment templates from configuration
    jq '.assessments[] | {
        id: .id,
        title: .metadata.title,
        description: .metadata.description,
        type: .metadata.type,
        duration: .metadata.duration_minutes,
        questions: .metadata.question_count,
        cohort: .cohort_id,
        teacher: .teacher_id,
        scheduled_date: .metadata.scheduled_date
    }' "${PILOT_DIR}/pilot-assessments.json" > data/pilot/templates/assessments.json
    
    print_status "✅ Assessment templates created: data/pilot/templates/assessments.json"
}

# Setup monitoring configuration
setup_monitoring() {
    print_step "Setting up pilot monitoring configuration..."
    
    mkdir -p data/pilot/monitoring
    
    # Copy monitoring configuration
    cp "${PILOT_DIR}/pilot-monitoring.json" data/pilot/monitoring/config.json
    
    # Create monitoring data directories
    mkdir -p data/pilot/monitoring/metrics
    mkdir -p data/pilot/monitoring/logs
    mkdir -p data/pilot/monitoring/reports
    
    # Initialize monitoring data files
    echo "[]" > data/pilot/monitoring/metrics/daily.json
    echo "[]" > data/pilot/monitoring/metrics/weekly.json
    echo "[]" > data/pilot/monitoring/logs/events.json
    
    print_status "✅ Monitoring configuration setup complete"
}

# Create pilot documentation package
create_documentation_package() {
    print_step "Creating pilot documentation package..."
    
    mkdir -p data/pilot/documentation
    
    # Copy all training materials
    cp -r "${TRAINING_DIR}"/* data/pilot/documentation/
    
    # Create pilot overview document
    cat > data/pilot/documentation/pilot-overview.md << EOF
# Assessment Engine Pilot Program Overview

## Program Details
- **Duration**: ${PILOT_DURATION} days
- **Participants**: ${TOTAL_STUDENTS} students, ${TOTAL_TEACHERS} teachers
- **Assessments**: ${TOTAL_ASSESSMENTS} pilot assessments
- **Start Date**: $(jq -r '.pilot_program.start_date' "${PILOT_DIR}/cohort-config.json")
- **End Date**: $(jq -r '.pilot_program.end_date' "${PILOT_DIR}/cohort-config.json")

## Cohorts
$(jq -r '.cohorts[] | "- **\(.name)**: \(.student_count) students, Grade \(.grade_level), \(.subject)"' "${PILOT_DIR}/cohort-config.json")

## Success Criteria
- System uptime: $(jq -r '.success_criteria.overall.system_uptime_target' "${PILOT_DIR}/cohort-config.json")%
- User satisfaction: $(jq -r '.success_criteria.overall.user_satisfaction_target' "${PILOT_DIR}/cohort-config.json")/5.0
- Completion rate: $(jq -r '.success_criteria.overall.completion_rate_target' "${PILOT_DIR}/cohort-config.json")%

## Support Contacts
- **Pilot Coordinator**: $(jq -r '.pilot_coordination.lead_coordinator.name' "${PILOT_DIR}/pilot-teachers.json")
- **Email**: $(jq -r '.pilot_coordination.lead_coordinator.email' "${PILOT_DIR}/pilot-teachers.json")
- **Technical Support**: $(jq -r '.pilot_coordination.technical_support.primary_contact' "${PILOT_DIR}/pilot-teachers.json")

## Documentation
All pilot documentation is available in this directory:
- Teacher Quick Start Guide
- Student Onboarding Guide
- Training Materials
- Feedback System Documentation
- Monitoring and Analytics Information

For questions or support, contact the pilot team using the information above.
EOF

    print_status "✅ Documentation package created: data/pilot/documentation/"
}

# Generate pilot summary report
generate_pilot_summary() {
    print_step "Generating pilot setup summary..."
    
    cat > pilot-setup-summary.json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "pilot_setup": {
    "status": "completed",
    "configuration": {
      "total_students": $TOTAL_STUDENTS,
      "total_teachers": $TOTAL_TEACHERS,
      "total_assessments": $TOTAL_ASSESSMENTS,
      "pilot_duration_days": $PILOT_DURATION
    },
    "cohorts": $(jq '.cohorts | length' "${PILOT_DIR}/cohort-config.json"),
    "files_created": [
      "data/pilot/question_banks.json",
      "data/pilot/questions.json",
      "data/pilot/assessments.json",
      "data/pilot/submissions.json",
      "data/pilot/accounts/teachers.csv",
      "data/pilot/accounts/students.csv",
      "data/pilot/templates/assessments.json",
      "data/pilot/monitoring/config.json",
      "data/pilot/documentation/"
    ],
    "next_steps": [
      "Deploy assessment engine service in pilot mode",
      "Conduct teacher training sessions",
      "Set up student accounts and onboarding",
      "Begin pilot assessment workflows",
      "Monitor system performance and user feedback"
    ]
  },
  "validation": {
    "configuration_files": "verified",
    "training_materials": "verified",
    "json_syntax": "valid",
    "pilot_data": "initialized"
  }
}
EOF

    print_status "✅ Pilot setup summary: pilot-setup-summary.json"
}

# Validate service connectivity (if running)
validate_service_connection() {
    print_step "Validating service connectivity..."
    
    if curl -f "${BASE_URL}/health" > /dev/null 2>&1; then
        print_status "✅ Assessment engine service is running and accessible"
        
        # Test pilot status endpoint
        if curl -f "${BASE_URL}/api/v1/pilot/status" > /dev/null 2>&1; then
            print_status "✅ Pilot mode endpoints are accessible"
        else
            print_warning "Pilot mode endpoints not accessible - service may not be in pilot mode"
        fi
    else
        print_warning "Assessment engine service is not running or not accessible"
        print_warning "Start the service with: npm run dev"
    fi
}

# Main setup process
main() {
    print_step "Starting Assessment Engine Pilot Cohort Setup..."
    
    # Verify all required files exist
    verify_pilot_files
    verify_training_materials
    
    # Load and validate configuration
    load_cohort_config
    
    # Set up pilot environment
    setup_pilot_database
    generate_pilot_accounts
    create_assessment_templates
    setup_monitoring
    create_documentation_package
    
    # Generate summary
    generate_pilot_summary
    
    # Validate service (if running)
    validate_service_connection
    
    echo ""
    echo "=================================================="
    echo "🎉 PILOT COHORT SETUP COMPLETED"
    echo "=================================================="
    echo "Pilot Configuration:"
    echo "  - Students: $TOTAL_STUDENTS across 3 cohorts"
    echo "  - Teachers: $TOTAL_TEACHERS trained educators"
    echo "  - Assessments: $TOTAL_ASSESSMENTS pilot assessments"
    echo "  - Duration: $PILOT_DURATION days"
    echo ""
    echo "Generated Files:"
    echo "  - Pilot data: data/pilot/"
    echo "  - User accounts: data/pilot/accounts/"
    echo "  - Assessment templates: data/pilot/templates/"
    echo "  - Monitoring config: data/pilot/monitoring/"
    echo "  - Documentation: data/pilot/documentation/"
    echo ""
    echo "📋 Next Steps:"
    echo "   1. Deploy assessment engine service: npm run dev"
    echo "   2. Verify pilot mode: curl ${BASE_URL}/api/v1/pilot/status"
    echo "   3. Conduct teacher training using materials in data/pilot/documentation/"
    echo "   4. Set up student accounts and begin onboarding"
    echo "   5. Start pilot assessment workflows"
    echo "   6. Monitor system performance and collect feedback"
    echo ""
    print_status "Pilot cohort setup completed successfully!"
}

# Run main function
main "$@"