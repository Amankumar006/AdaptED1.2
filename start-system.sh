#!/bin/bash

# Educational Platform System Startup Script
# Starts all components so you can test the system manually

set -e

echo "🚀 Starting Educational Platform System"
echo "======================================"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install npm first.${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Installing dependencies...${NC}"

# Install student portal dependencies
if [ -d "student-portal" ]; then
    echo "Installing student portal dependencies..."
    cd student-portal
    npm install
    cd ..
else
    echo -e "${YELLOW}⚠️  student-portal directory not found${NC}"
fi

# Install teacher portal dependencies
if [ -d "teacher-portal" ]; then
    echo "Installing teacher portal dependencies..."
    cd teacher-portal
    npm install
    cd ..
else
    echo -e "${YELLOW}⚠️  teacher-portal directory not found${NC}"
fi

# Skip analytics service for now (has dependency issues)
echo -e "${YELLOW}⚠️  Skipping analytics service (dependency issues)${NC}"

echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Function to start a service in the background
start_service() {
    local service_name=$1
    local directory=$2
    local command=$3
    local port=$4
    
    echo -e "${BLUE}🚀 Starting $service_name on port $port...${NC}"
    
    if [ -d "$directory" ]; then
        cd "$directory"
        $command &
        local pid=$!
        echo "$pid" > "../${service_name// /-}.pid"
        cd - > /dev/null
        
        # Wait a moment for the service to start
        sleep 3
        
        # Check if service is running
        if kill -0 $pid 2>/dev/null; then
            echo -e "${GREEN}✅ $service_name started successfully (PID: $pid)${NC}"
        else
            echo -e "${RED}❌ Failed to start $service_name${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Directory $directory not found, skipping $service_name${NC}"
    fi
}

echo -e "${BLUE}🎯 Starting all services...${NC}"
echo ""

# Start Student Portal (React app)
start_service "Student Portal" "student-portal" "npm run dev" "3000"

# Start Teacher Portal (React app)  
start_service "Teacher Portal" "teacher-portal" "npm run dev" "3001"

# Skip Analytics Service for now
echo -e "${YELLOW}⚠️  Skipping Analytics Service (dependency issues)${NC}"

echo ""
echo -e "${GREEN}🎉 System startup complete!${NC}"
echo ""
echo -e "${BLUE}📱 Access the applications:${NC}"
echo "🎓 Student Portal:  http://localhost:3000"
echo "👨‍🏫 Teacher Portal:  http://localhost:3001"
echo ""
echo -e "${BLUE}🧪 Test the system:${NC}"
echo "1. Open Student Portal in your browser"
echo "2. Open Teacher Portal in another tab"
echo "3. Try logging in, creating lessons, taking assessments"
echo "4. Test the BuddyAI chat feature"
echo "5. Check analytics and dashboards"
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo "• Use demo credentials: student@demo.com / teacher@demo.com"
echo "• Password: demo123"
echo "• Check browser console for any errors"
echo "• Use browser dev tools to inspect network requests"
echo ""
echo -e "${RED}🛑 To stop all services, run: ./stop-system.sh${NC}"
echo ""

# Create stop script
cat > stop-system.sh << 'EOF'
#!/bin/bash

echo "🛑 Stopping Educational Platform System..."

# Kill all services using PID files
for pidfile in *.pid; do
    if [ -f "$pidfile" ]; then
        pid=$(cat "$pidfile")
        service_name=$(basename "$pidfile" .pid)
        
        if kill -0 $pid 2>/dev/null; then
            echo "Stopping $service_name (PID: $pid)..."
            kill $pid
            rm "$pidfile"
        else
            echo "$service_name was not running"
            rm "$pidfile"
        fi
    fi
done

# Also kill any remaining npm/node processes on our ports
echo "Cleaning up any remaining processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:8004 | xargs kill -9 2>/dev/null || true

echo "✅ All services stopped"
EOF

chmod +x stop-system.sh

echo -e "${GREEN}🎯 Ready to test! Open the URLs above in your browser.${NC}"