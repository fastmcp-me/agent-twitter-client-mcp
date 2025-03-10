# Twitter Grok AI Examples

This directory contains examples of how to use the Twitter Grok AI integration through the `agent-twitter-client` library.

## Prerequisites

1. You need to have valid Twitter authentication (cookies or username/password)
2. You need to have access to Twitter's Grok AI feature (Premium subscription)
3. You need to use `agent-twitter-client` version 0.0.19 or higher

## Examples

There are two examples provided:

1. **Simple Grok Call** (`simple-grok.js`): Demonstrates a single interaction with Grok AI

   - Sends a single message to Grok and displays the response
   - Good for testing basic functionality and authentication

2. **Continuous Grok Chat** (`grok-chat.js`): Demonstrates a multi-turn conversation with Grok AI
   - Interactive command-line chat interface
   - Maintains conversation history
   - Handles rate limiting and errors gracefully

## Running the Examples

You can run these examples using the `run-demo.sh` script with the `--use-local-agent-twitter-client` flag to temporarily use version 0.0.19 of the agent-twitter-client:

```bash
# Make sure you're in the demo directory
cd demo

# Run the simple Grok example
./run-demo.sh --script simple-grok.js --use-local-agent-twitter-client

# Run the continuous chat Grok example
./run-demo.sh --script grok-chat.js --use-local-agent-twitter-client

# Run with environment variable debugging
./run-demo.sh --script simple-grok.js --use-local-agent-twitter-client --debug-env
```

## Authentication

The Grok examples support multiple authentication methods and will try them in the following order:

1. **Cookie Authentication**:

   - Environment Variables: Set `TWITTER_COOKIES` in your `demo/.env` file with your Twitter cookies
   - Cookie File: Create a `cookies.json` file in the demo directory with your Twitter cookies in the format exported by browser extensions like "Cookie-Editor"

2. **Username/Password Authentication**:
   - Set `TWITTER_USERNAME` and `TWITTER_PASSWORD` in your `demo/.env` file

> **Important**: Unlike other Twitter API features, Grok functionality requires username/password authentication if cookie authentication fails. The examples will automatically try both methods regardless of the `AUTH_METHOD` setting in your `.env` file.

### Cookie Format Requirements

The cookie format is critical for successful authentication. For the `TWITTER_COOKIES` environment variable, you must use a properly formatted JSON array of strings:

```
TWITTER_COOKIES=["auth_token=YOUR_AUTH_TOKEN; Domain=.twitter.com", "ct0=YOUR_CT0_VALUE; Domain=.twitter.com", "twid=u%3DYOUR_USER_ID; Domain=.twitter.com"]
```

Key requirements:

- The entire value must be enclosed in double quotes in your `.env` file
- Each cookie string must be enclosed in double quotes and separated by commas
- The array must be properly formatted with square brackets
- Include the `Domain=.twitter.com` part for each cookie
- Essential cookies are `auth_token`, `ct0`, and `twid`

### Obtaining Cookies

To get your Twitter cookies:

1. Log in to Twitter in your browser
2. Open Developer Tools (F12)
3. Go to the Application tab > Cookies > https://twitter.com
4. Copy the values of `auth_token`, `ct0`, and `twid` cookies
5. Format them as shown above

## Environment File Setup

The Grok examples specifically look for the `.env` file in the `demo` directory, not in the project root. Make sure your authentication credentials are set in `demo/.env`, not in the root `.env` file.

Example `demo/.env` file:

```
# Cookie-based authentication
AUTH_METHOD=cookies
TWITTER_COOKIES=["auth_token=YOUR_AUTH_TOKEN; Domain=.twitter.com", "ct0=YOUR_CT0_VALUE; Domain=.twitter.com", "twid=u%3DYOUR_USER_ID; Domain=.twitter.com"]

# Username/password authentication for Grok
TWITTER_USERNAME=your_username
TWITTER_PASSWORD=your_password
TWITTER_EMAIL=your_email@example.com
```

## Notes on Version Compatibility

These examples require `agent-twitter-client` version 0.0.19 or higher, which includes the Grok AI integration. The `--use-local-agent-twitter-client` flag in the `run-demo.sh` script temporarily installs this version directly from GitHub without modifying your project's package.json, allowing you to test the Grok functionality without breaking CI processes that depend on version 0.0.18.

> **Note**: Currently, agent-twitter-client v0.0.19 is available on GitHub but not yet on npm. The demo scripts will automatically install it from GitHub when needed.

## Common Errors and Troubleshooting

### Authentication Errors

1. **Cookie Format Issues**:

   - Error: "Cookie login check result: false"
   - Solution: Ensure your cookies are in the correct JSON array format
   - Try running with `--debug-env` to see how your cookies are being parsed

2. **Cloudflare Protection**:

   - Error: "Failed to login with credentials: <!DOCTYPE html>..." (HTML response)
   - Cause: Cloudflare is blocking automated login attempts
   - Solution: Use cookie authentication instead, or try again later

3. **Missing Credentials**:
   - Error: "Not logged in to Twitter. Please check your cookies or credentials."
   - Solution: Ensure you have set either `TWITTER_COOKIES` or `TWITTER_USERNAME`/`TWITTER_PASSWORD` in your `demo/.env` file

### Grok-Specific Errors

1. **Rate Limiting**:

   - Error: "Rate Limited: You've reached the limit..."
   - Cause: Grok has a limit of 25 messages per 2 hours for non-premium accounts
   - Solution: Wait until the rate limit resets or upgrade to a premium account

2. **Missing Grok Methods**:

   - Error: "scraper.createGrokConversation is not a function"
   - Cause: Using an older version of agent-twitter-client
   - Solution: Make sure you're using the `--use-local-agent-twitter-client` flag

3. **Premium Subscription Required**:
   - Error: "You need to be a Premium subscriber to use Grok"
   - Solution: Upgrade your Twitter account to a premium subscription

## Example Output

### Simple Grok Call

```
Current directory: /Users/username/project/demo
Using .env file: /Users/username/project/demo/.env
Loading environment from: /Users/username/project/demo/.env
Environment variables loaded:
AUTH_METHOD: cookies
TWITTER_COOKIES: [Set]
TWITTER_USERNAME: [Set]
TWITTER_PASSWORD: [Set]
TWITTER_EMAIL: [Set]
Scraper initialized successfully
Using cookies from environment variables...
Cookie format check:
Cookies appear to be in JSON array format
Found 3 cookies in JSON array
Cookie login check result: true
Creating a new Grok conversation...
Conversation created with ID: 1234567890abcdef
Sending a message to Grok...

--- Grok Response ---
Here are the current trending topics on Twitter:

1. #WorldNewsToday
2. #TechUpdates
3. #SportsHighlights
4. #EntertainmentNews
5. #PoliticalDiscussion

These trends are based on real-time Twitter activity and may vary by region and time.
---------------------
```

### Continuous Grok Chat

```
Current directory: /Users/username/project/demo
Using .env file: /Users/username/project/demo/.env
Loading environment from: /Users/username/project/demo/.env
Environment variables loaded:
AUTH_METHOD: cookies
TWITTER_COOKIES: [Set]
TWITTER_USERNAME: [Set]
TWITTER_PASSWORD: [Set]
TWITTER_EMAIL: [Set]
Scraper initialized successfully
Using cookies from environment variables...
Cookie format check:
Cookies appear to be in JSON array format
Found 3 cookies in JSON array
Cookie login check result: true

=== Twitter Grok AI Chat ===
Type your messages to chat with Grok. Type "exit" to quit.

Creating a new Grok conversation...
Conversation created with ID: 1234567890abcdef

You: What are the trending topics on Twitter right now?

Grok is thinking...

Grok: Based on Twitter's current data, the trending topics include:

1. #WorldNewsToday - Global news events
2. #TechUpdates - Technology news and product launches
3. #SportsHighlights - Major sports events and results
4. #EntertainmentNews - Celebrity and entertainment updates
5. #PoliticalDiscussion - Political debates and news

These trends are dynamic and can vary by region and time of day. Is there a specific trend you'd like to know more about?

--------------------------------------------------

You: Tell me more about the tech updates
...
```

## Grok Capabilities

Grok on Twitter has access to real-time Twitter data that even the standalone Grok API doesn't have. This means you can ask Grok about:

- Current trending topics on Twitter
- Analysis of recent tweets on specific subjects
- Information about Twitter users and their content
- Real-time events being discussed on the platform

Example queries:

- "What are the trending topics on Twitter right now?"
- "Analyze the sentiment around AI on Twitter"
- "What are people saying about the latest Apple event?"
- "Show me information about popular memecoins being discussed today"
