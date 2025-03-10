#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Default values
DEBUG_MODE=false
SPECIFIC_SCRIPT=""
USE_LOCAL_AGENT_TWITTER_CLIENT=false
DEBUG_ENV=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --debug)
      DEBUG_MODE=true
      shift
      ;;
    --debug-env)
      DEBUG_ENV=true
      shift
      ;;
    --script)
      SPECIFIC_SCRIPT="$2"
      shift 2
      ;;
    --use-local-agent-twitter-client)
      USE_LOCAL_AGENT_TWITTER_CLIENT=true
      shift
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  --debug                        Enable debug mode"
      echo "  --debug-env                    Debug environment variables"
      echo "  --script SCRIPT                Run a specific script (e.g., fixed-tweet.js, simple-grok.js, grok-chat.js)"
      echo "  --use-local-agent-twitter-client  Use local version of agent-twitter-client v0.0.19"
      echo "  --help                         Show this help message"
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

# Check if .env file exists in the demo directory
if [ ! -f ".env" ]; then
    echo "No .env file found in demo directory. Creating from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "Created .env file. Please edit it with your Twitter credentials."
    else
        echo "No .env.example file found. Please create a .env file with your Twitter credentials."
        exit 1
    fi
fi

# Print the current directory and .env file location for debugging
echo "Current directory: $SCRIPT_DIR"
echo "Using .env file: $SCRIPT_DIR/.env"

# Debug .env file if requested
if [ "$DEBUG_ENV" = true ]; then
    echo "=== .env file contents (with sensitive data masked) ==="
    grep -v "^#" .env | sed 's/\(PASSWORD=\).*/\1[MASKED]/g' | sed 's/\(TOKEN=\).*/\1[MASKED]/g'
    echo "=== End of .env file contents ==="
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# If using local agent-twitter-client v0.0.19
if [ "$USE_LOCAL_AGENT_TWITTER_CLIENT" = true ]; then
    echo "Using local agent-twitter-client v0.0.19..."
    
    # Install directly from GitHub instead of npm
    echo "Installing agent-twitter-client v0.0.19 from GitHub..."
    npm install --no-save github:elizaOS/agent-twitter-client#0.0.19
    
    if [ $? -eq 0 ]; then
        echo "agent-twitter-client v0.0.19 installed temporarily for this session"
    else
        echo "Failed to install agent-twitter-client v0.0.19 from GitHub"
        echo "Trying alternative installation method..."
        npm install --no-save https://github.com/elizaOS/agent-twitter-client/tarball/0.0.19
        
        if [ $? -eq 0 ]; then
            echo "agent-twitter-client v0.0.19 installed temporarily for this session"
        else
            echo "Failed to install agent-twitter-client v0.0.19. Please check your internet connection or GitHub access."
            exit 1
        fi
    fi
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