#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Default values
DEBUG_MODE=false
SPECIFIC_SCRIPT=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --debug)
      DEBUG_MODE=true
      shift
      ;;
    --script)
      SPECIFIC_SCRIPT="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  --debug              Enable debug mode"
      echo "  --script SCRIPT      Run a specific script (e.g., fixed-tweet.js)"
      echo "  --help               Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help to see available options"
      exit 1
      ;;
  esac
done

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

# Set environment variables based on options
if [ "$DEBUG_MODE" = true ]; then
    export DEBUG=true
    echo "Debug mode enabled"
fi

# Run the specified script or the default demo
if [ -n "$SPECIFIC_SCRIPT" ]; then
    if [ -f "$SPECIFIC_SCRIPT" ]; then
        echo "Running specific script: $SPECIFIC_SCRIPT"
        node "$SPECIFIC_SCRIPT"
    else
        echo "Error: Script '$SPECIFIC_SCRIPT' not found"
        echo "Available scripts:"
        ls -1 *.js
        exit 1
    fi
else
    # Run the default demo
    echo "Starting the demo..."
    node index.js
fi

# Exit with the status of the last command
exit_code=$?
if [ $exit_code -ne 0 ]; then
    echo "Demo exited with error code: $exit_code"
fi
exit $exit_code 