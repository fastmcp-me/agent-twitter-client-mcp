# How to Run the Twitter MCP Demo

This guide explains how to run the Twitter MCP demo, including the fixed version that handles character limits and error cases properly.

## Prerequisites

- Node.js installed
- npm installed
- Twitter credentials (cookies, username/password, or API keys)

## Setup

1. Make sure you have the required environment variables set in a `.env` file. If you don't have one, the demo will create one from `.env.example`.

2. Make sure the scripts are executable:
   ```bash
   chmod +x run-demo.sh run-fixed-tweet.sh
   ```

## Running the Demo

### Option 1: Interactive Menu

To run the interactive menu demo:

```bash
./run-demo.sh
```

This will start the main demo menu where you can choose from various options.

### Option 2: Fixed Tweet Demo

To run the fixed tweet demo directly:

```bash
./run-fixed-tweet.sh
```

This will start the fixed tweet demo that includes:

- Character limit validation
- Improved error handling
- Better process management
- Reply functionality with metadata warnings

### Debug Mode

To enable debug mode for more detailed logging:

```bash
./run-demo.sh --debug
```

or

```bash
./run-fixed-tweet.sh --debug
```

### Running Specific Scripts

To run a specific script directly:

```bash
./run-demo.sh --script fixed-tweet.js
```

## Available Scripts

- `fixed-tweet.js`: The fixed version of the tweet sender with improved error handling
- `send-tweet.js`: The original tweet sender
- `tweet-search.js`: Search for tweets from specific users
- `tweet-thread.js`: Send a thread of tweets
- `simple-tweet.js`: A simplified tweet demo

## Troubleshooting

### Character Limit Errors

Twitter has a 280 character limit for tweets. The fixed demo will warn you if your tweet exceeds this limit.

When replying to tweets, Twitter adds metadata (like @username) that counts toward this limit. The fixed demo will warn you about this and give you the option to continue or abort.

### Process Exit Errors

If the MCP process exits unexpectedly, the fixed demo will attempt to restart it automatically.

### Path Issues

If you see "command not found" errors, make sure you're running the scripts from the demo directory.

### EPIPE Errors

These can occur if the MCP process is terminated unexpectedly. The fixed demo includes better error handling for these cases.

## Help

For more information about the available options:

```bash
./run-demo.sh --help
```

or

```bash
./run-fixed-tweet.sh --help
```
