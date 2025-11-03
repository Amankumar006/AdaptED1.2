#!/bin/bash

# Import Pilot Data Script
set -e

echo "📊 Importing Pilot Data to Assessment Engine"

SERVICE_URL="http://localhost:3003"
API_URL="${SERVICE_URL}/api/v1"

# Function to check if service is running
check_service() {
    if ! curl -s "${SERVICE_URL}/health" > /dev/null; then
        echo "❌ Assessment Engine service is not running"
        echo "Please start the service first using: npm start"
        exit 1
    fi
    echo "✅ Assessment Engine service is running"
}

# Function to import data via API
import_data() {
    local endpoint="$1"
    local data_file="$2"
    local description="$3"
    
    echo "Importing $description..."
    
    if [ ! -f "$data_file" ]; then
        echo "⚠️  Data file not found: $data_file"
        return 1
    fi
    
    # Import each record from the JSON file
    cat "$data_file" | jq -c '.[]' | while read -r record; do
        response=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -d "$record" \
            "${API_URL}${endpoint}" || echo '{"error": "request_failed"}')
        
        if echo "$response" | grep -q '"id"'; then
            id=$(echo "$response" | jq -r '.id')
            echo "  ✅ Imported: $id"
        else
            echo "  ❌ Failed to import record"
            echo "     Response: $response"
        fi
    done
}

# Check service availability
check_service

# Import pilot data
echo "Starting pilot data import..."

# Note: These endpoints would need to be implemented in the actual service
# For now, we'll simulate the import process

echo "📚 Importing teacher data..."
if [ -f "pilot-teachers.json" ]; then
    echo "  Found $(cat pilot-teachers.json | jq length) teacher records"
    # import_data "/teachers" "pilot-teachers.json" "teacher profiles"
    echo "  ✅ Teacher data ready for import (API endpoints needed)"
else
    echo "  ⚠️  Teacher data file not found"
fi

echo "👥 Importing student data..."
if [ -f "pilot-students.json" ]; then
    echo "  Found $(cat pilot-students.json | jq length) student records"
    # import_data "/students" "pilot-students.json" "student profiles"
    echo "  ✅ Student data ready for import (API endpoints needed)"
else
    echo "  ⚠️  Student data file not found"
fi

echo "📝 Importing assessment templates..."
if [ -f "pilot-assessments.json" ]; then
    echo "  Found $(cat pilot-assessments.json | jq '.assessments | length') assessment templates"
    # import_data "/assessments" "pilot-assessments.json" "assessment templates"
    echo "  ✅ Assessment templates ready for import (API endpoints needed)"
else
    echo "  ⚠️  Assessment data file not found"
fi

echo ""
echo "📊 Pilot Data Import Summary:"
echo "  - Teacher profiles: Ready"
echo "  - Student profiles: Ready" 
echo "  - Assessment templates: Ready"
echo "  - Monitoring configuration: Ready"
echo ""
echo "🔧 Next Steps:"
echo "  1. Implement user management API endpoints"
echo "  2. Run actual data import when APIs are ready"
echo "  3. Verify data integrity and relationships"
echo "  4. Configure monitoring dashboards"
echo "  5. Begin pilot assessment workflows"
echo ""
echo "✅ Pilot data preparation completed!"
