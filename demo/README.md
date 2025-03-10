# agent-twitter-client-mcp Demo

This directory contains a demo project for the `agent-twitter-client-mcp` package, which allows you to interact with Twitter through a Machine Communication Protocol (MCP) server.

## Features

- Start a new MCP server or connect to an existing one
- Search for tweets from specific users
- List available tools
- Send tweets and reply to existing tweets
- Handle port conflicts gracefully
- Robust error handling and automatic reconnection
- Twitter Grok AI integration (requires agent-twitter-client v0.0.19+)

## Usage Options

### Option 1: Start a new MCP server

```javascript
const client = new McpClient({
  port: 3001,
  debug: true,
  startServer: true, // Default is true
});

await client.start();
```

### Option 2: Connect to an existing MCP server

```javascript
// First, start the MCP server in a separate process
// PORT=3001 npx agent-twitter-client-mcp

const client = new McpClient({
  port: 3001,
  debug: true,
  startServer: false, // Connect to existing server
});

await client.start();
```

## Example Scripts

The demo includes several scripts that demonstrate different aspects of the MCP client:

### Tweet Operations

- `tweet-search.js`: Search for tweets from specific users and save tweet IDs for later replying
- `send-tweet.js`: Send a single tweet or reply to an existing tweet
- `tweet-thread.js`: Send a thread of tweets with proper reply chains
- `simple-tweet.js`: A simplified example of sending a tweet
- `fixed-tweet.js`: An improved tweet sender with better error handling and character limit validation

### Grok AI Operations

- `simple-grok.js`: Demonstrates a single interaction with Twitter's Grok AI
- `grok-chat.js`: Demonstrates a multi-turn conversation with Twitter's Grok AI

## Running the Demo

### Interactive Menu

For the best experience, use the interactive menu:

```bash
cd demo
./run-demo.sh
```

### Running Specific Scripts

To run a specific script:

```bash
# Run a tweet-related script
./run-demo.sh --script fixed-tweet.js

# Run a Grok-related script (requires agent-twitter-client v0.0.19+)
./run-demo.sh --script simple-grok.js --use-local-agent-twitter-client
./run-demo.sh --script grok-chat.js --use-local-agent-twitter-client
```

### Debug Options

```bash
# Enable debug mode for detailed logging
./run-demo.sh --debug

# Debug environment variables and authentication
./run-demo.sh --debug-env
```

> **Note**: The Grok examples require agent-twitter-client v0.0.19, which is currently available on GitHub but not yet on npm. The demo scripts will automatically install it from GitHub when needed.

See `GROK_EXAMPLES.md` for more details on the Grok integration.

## Grok AI Integration

The Grok AI integration allows you to interact with Twitter's Grok AI chatbot through the same interface used for other Twitter operations. This provides several unique capabilities:

1. **Access to Twitter's Real-Time Data**: Grok on Twitter has access to real-time platform data that even the standalone Grok API doesn't have.

2. **Trending Topics Analysis**: Ask Grok about current trending topics and get detailed analysis.

3. **User and Content Insights**: Get insights about Twitter users and their content.

4. **Conversation Management**: Maintain multi-turn conversations with proper context.

### Authentication for Grok

Grok examples support two authentication methods:

1. **Cookie Authentication**:

   - Cookies must be in JSON array format in your `demo/.env` file
   - Example: `TWITTER_COOKIES=["auth_token=YOUR_AUTH_TOKEN; Domain=.twitter.com", "ct0=YOUR_CT0_VALUE; Domain=.twitter.com"]`

2. **Username/Password Authentication**:
   - Set `TWITTER_USERNAME` and `TWITTER_PASSWORD` in your `demo/.env` file
   - This is used as a fallback if cookie authentication fails

**Important**: The Grok examples specifically look for the `.env` file in the demo directory, not in the project root.

## Searching for Tweets

To search for tweets from a specific user:

```javascript
const request = {
  jsonrpc: "2.0",
  id: "unique-id",
  method: "tools/call",
  params: {
    name: "get_user_tweets",
    arguments: {
      username: "twitter_username",
      count: 3, // Number of tweets to retrieve
      includeReplies: false, // Whether to include replies
      includeRetweets: true, // Whether to include retweets
    },
  },
};
```

The response will contain tweet data including:

- Tweet ID
- Text content
- Author information
- Creation timestamp
- Engagement metrics (likes, retweets, replies)
- Media attachments
- Tweet type (regular, reply, retweet, quote)

## Sending Tweets

When sending a tweet, use the following format:

```javascript
const request = {
  jsonrpc: "2.0",
  id: "unique-id",
  method: "tools/call",
  params: {
    name: "send_tweet",
    arguments: {
      text: "Your tweet text here",
    },
  },
};
```

For replying to a tweet, add the `replyToTweetId` parameter:

```javascript
request.params.arguments.replyToTweetId = "tweet-id-to-reply-to";
```

## Setup

1. Run the setup script:

```bash
./setup.sh
```

2. Edit the `.env` file with your Twitter credentials

3. Run the demo:

```bash
npm start
```

## Troubleshooting

If you encounter issues:

1. **Port Conflicts**: The client will automatically try different ports if the default port is in use.

2. **Connection Issues**: If you're connecting to an existing server, make sure it's running before starting the client.

3. **Response Parsing Issues**: If you see "No tweets found" but the debug output shows tweets, there might be an issue with parsing the response format. Try running with debug mode enabled to see the raw response:

   ```bash
   DEBUG=true ./run-demo.sh
   ```

4. **EPIPE Errors**: These can occur if the MCP process is terminated unexpectedly. The client includes automatic reconnection logic.

5. **Debug Mode**: Enable debug mode for more detailed logging:

   ```javascript
   const client = new McpClient({ debug: true });
   ```

6. **Grok-Specific Issues**: See the `GROK_EXAMPLES.md` file for detailed troubleshooting of Grok-related issues.

## Files

### Core Files

- `mcp-client.js`: A client library for interacting with the MCP server
- `index.js`: A menu-driven interface for the demo
- `setup.sh`: A script for setting up the demo
- `run-demo.sh`: A script for running the demo
- `run-fixed-tweet.sh`: A script for running the fixed tweet demo

### Tweet-Related Files

- `tweet-search.js`: Search for tweets from specific users
- `send-tweet.js`: A script for sending a single tweet
- `tweet-thread.js`: A script for sending a thread of tweets
- `simple-tweet.js`: A simplified tweet demo
- `fixed-tweet.js`: The fixed version of the tweet sender with improved error handling
- `tweets.js`: A collection of pre-written tweets

### Grok-Related Files

- `simple-grok.js`: A simple example of using Twitter's Grok AI
- `grok-chat.js`: An interactive chat example with Twitter's Grok AI

### Documentation Files

- `README.md`: This file
- `HOW_TO_DEMO.md`: Detailed instructions for running the demo
- `GROK_EXAMPLES.md`: Documentation for the Grok AI examples
- `.env.example`: An example environment file
