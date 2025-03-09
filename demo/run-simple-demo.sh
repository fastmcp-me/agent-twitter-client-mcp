#!/bin/bash

# Simple script to run the Twitter MCP demo menu

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js to run this demo."
    exit 1
fi

# Check if the required packages are installed
if [ ! -d "node_modules" ]; then
    echo "Installing required packages..."
    npm install
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "Error: .env file not found. Please create a .env file with your Twitter credentials."
    echo "You can copy .env.example to .env and fill in your credentials."
    exit 1
fi

# Run the menu script
echo "Starting Twitter MCP Demo..."
node simple-menu.js

# Exit with the same code as the menu script
exit $? 