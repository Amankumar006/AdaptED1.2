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
