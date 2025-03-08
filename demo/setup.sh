#!/bin/bash

# Install dependencies
echo "Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
  echo "Creating .env file from .env.example..."
  cp .env.example .env
  echo "Please edit the .env file with your Twitter credentials."
else
  echo ".env file already exists."
fi

echo ""
echo "Setup complete! You can now run the demo with:"
echo "npm start" 