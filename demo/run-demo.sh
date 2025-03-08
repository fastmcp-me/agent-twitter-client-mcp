#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js to run this demo."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "npm is not installed. Please install npm to run this demo."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "No .env file found. Creating from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "Created .env file. Please edit it with your Twitter credentials."
    else
        echo "No .env.example file found. Please create a .env file with your Twitter credentials."
        exit 1
    fi
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Run the demo
echo "Starting the demo..."
node index.js

# Exit with the status of the last command
exit $? 