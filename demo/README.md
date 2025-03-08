# agent-twitter-client-mcp Demo

This directory contains a demo project for the `agent-twitter-client-mcp` package, which allows you to interact with Twitter through a Machine Communication Protocol (MCP) server.

## Features

- Start a new MCP server or connect to an existing one
- Search for tweets from specific users
- List available tools
- Send tweets and reply to existing tweets
- Handle port conflicts gracefully
- Robust error handling and automatic reconnection

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

- `tweet-search.js`: Search for tweets from specific users and save tweet IDs for later replying
- `send-tweet.js`: Send a single tweet or reply to an existing tweet
- `tweet-thread.js`: Send a thread of tweets with proper reply chains
- `simple-tweet.js`: A simplified example of sending a tweet

To run any of these scripts:

```bash
node demo/script-name.js
```

For the best experience, use the interactive menu:

```bash
cd demo
./run-demo.sh
```

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

## Files

- `mcp-client.js`: A client library for interacting with the MCP server
- `tweet-search.js`: Search for tweets from specific users
- `send-tweet.js`: A script for sending a single tweet
- `tweet-thread.js`: A script for sending a thread of tweets
- `simple-tweet.js`: A simplified tweet demo
- `index.js`: A menu-driven interface for the demo
- `tweets.js`: A collection of pre-written tweets
- `setup.sh`: A script for setting up the demo
- `run-demo.sh`: A script for running the demo
- `HOW_TO_DEMO.md`: Detailed instructions for running the demo
- `.env.example`: An example environment file
