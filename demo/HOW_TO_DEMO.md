# How to Demo the Twitter MCP Client

This guide provides step-by-step instructions for demonstrating the Twitter MCP client.

## Quick Start

1. Navigate to the demo directory:

   ```bash
   cd demo
   ```

2. Make the run script executable (if not already):

   ```bash
   chmod +x run-demo.sh
   ```

3. Run the demo:
   ```bash
   ./run-demo.sh
   ```

## Demo Workflow

### Option 1: Search for Tweets (Recommended First Step)

1. From the main menu, select "Search for tweets from a user"
2. Choose to search for a specific username or select from predefined users
3. Select the number of tweets to retrieve
4. View the tweets and optionally save a tweet ID for later replying

### Option 2: Send a Tweet

1. From the main menu, select "Send a single tweet"
2. Choose a pre-written tweet or enter your own
3. Optionally, make it a reply to a previously saved tweet ID

### Option 3: Send a Tweet Thread

1. From the main menu, select "Send a tweet thread"
2. Confirm the thread you want to send
3. Watch as the tweets are sent in sequence, forming a thread

## Understanding the Response Format

The Twitter MCP server returns responses in a specific format:

1. **Nested JSON**: Tweet data is returned as a JSON string inside the `text` field of the response
2. **Tweet Structure**: Each tweet contains fields like:
   - `id`: The unique identifier for the tweet
   - `text`: The content of the tweet
   - `author`: Information about the tweet author
   - `createdAt`: When the tweet was created
   - `metrics`: Engagement metrics (likes, retweets, etc.)
   - `media`: Any photos or videos in the tweet
   - `permanentUrl`: The URL to view the tweet on Twitter

## Troubleshooting

If you encounter any issues:

1. **Connection Errors**: Make sure your Twitter credentials are correctly set in the `.env` file

2. **Port Conflicts**: Try using a different port through the "Configure settings" option

3. **Tool Not Available**: If a tool like "get_user_tweets" is not available, make sure you're using the latest version of the MCP

4. **Debug Mode**: Enable debug mode through the "Configure settings" option for more detailed logging

5. **Response Parsing Issues**: If you see "No tweets found" but the debug output shows tweets, there might be an issue with parsing the response format. Try running with debug mode enabled to see the raw response.

## Manual Testing

You can also run individual scripts directly:

```bash
# Search for tweets
node tweet-search.js

# Send a tweet
node send-tweet.js

# Send a tweet thread
node tweet-thread.js
```

## Environment Variables

You can customize the behavior with environment variables:

- `PORT`: The port to use for the MCP server (default: 3001)
- `DEBUG`: Enable debug mode (set to "true")
- `START_SERVER`: Whether to start a new MCP server or connect to an existing one (default: "true")

Example:

```bash
PORT=3002 DEBUG=true node tweet-search.js
```
