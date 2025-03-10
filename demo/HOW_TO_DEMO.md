# How to Run the Twitter MCP Demo

This guide explains how to run the Twitter MCP demo, including the fixed version that handles character limits and error cases properly, as well as the Grok AI integration examples.

## Prerequisites

- Node.js installed
- npm installed
- Twitter credentials (cookies, username/password, or API keys)
- For Grok functionality: Twitter Premium subscription and agent-twitter-client v0.0.19+

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

This will start the main demo menu where you can choose from various options, including the Grok AI examples.

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

### Option 3: Grok AI Examples

To run the Grok AI examples:

```bash
# Simple Grok example (single interaction)
./run-demo.sh --script simple-grok.js --use-local-agent-twitter-client

# Interactive Grok chat example
./run-demo.sh --script grok-chat.js --use-local-agent-twitter-client
```

The `--use-local-agent-twitter-client` flag is required as Grok functionality is only available in agent-twitter-client v0.0.19 or higher, which will be temporarily installed from GitHub.

### Debug Mode

To enable debug mode for more detailed logging:

```bash
./run-demo.sh --debug
```

To debug environment variables and authentication:

```bash
./run-demo.sh --debug-env
```

### Running Specific Scripts

To run a specific script directly:

```bash
./run-demo.sh --script fixed-tweet.js
```

## Available Scripts

### Tweet Operations

- `fixed-tweet.js`: The fixed version of the tweet sender with improved error handling
- `send-tweet.js`: The original tweet sender
- `tweet-search.js`: Search for tweets from specific users
- `tweet-thread.js`: Send a thread of tweets
- `simple-tweet.js`: A simplified tweet demo

### Grok AI Operations

- `simple-grok.js`: A simple example of using Twitter's Grok AI for a single interaction
- `grok-chat.js`: An interactive chat example with Twitter's Grok AI

## Authentication for Grok

Grok examples require proper authentication. They support two methods:

1. **Cookie Authentication**:

   - Cookies must be in JSON array format in your `.env` file
   - Example: `TWITTER_COOKIES=["auth_token=YOUR_AUTH_TOKEN; Domain=.twitter.com", "ct0=YOUR_CT0_VALUE; Domain=.twitter.com"]`

2. **Username/Password Authentication**:
   - Set `TWITTER_USERNAME` and `TWITTER_PASSWORD` in your `.env` file
   - This is used as a fallback if cookie authentication fails

**Important**: The Grok examples specifically look for the `.env` file in the demo directory, not in the project root.

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

### Grok-Specific Issues

1. **Version Issues**: If you see errors about missing Grok methods, make sure you're using the `--use-local-agent-twitter-client` flag.

2. **Authentication Issues**:

   - Cookie format must be correct (JSON array)
   - If using username/password, you may encounter Cloudflare protection
   - Premium subscription is required for Grok access

3. **Rate Limits**: Grok has rate limits (typically 25 messages per 2 hours for non-premium accounts).

## Help

For more information about the available options:

```bash
./run-demo.sh --help
```

or

```bash
./run-fixed-tweet.sh --help
```

For more details on the Grok examples, see `GROK_EXAMPLES.md`.
