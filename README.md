# agent-twitter-client-mcp

[![npm version](https://img.shields.io/npm/v/agent-twitter-client-mcp.svg)](https://www.npmjs.com/package/agent-twitter-client-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/agent-twitter-client-mcp.svg)](https://nodejs.org)

A Model Context Protocol (MCP) server that integrates with Twitter using the `agent-twitter-client` package, allowing AI models to interact with Twitter without direct API access.

## Features

- **Authentication Options**:

  - Cookie-based authentication (recommended)
  - Username/password authentication
  - Twitter API v2 credentials

- **Tweet Operations**:

  - Fetch tweets from users
  - Get specific tweets by ID
  - Search tweets
  - Send tweets with text and media
  - Create polls
  - Like, retweet, and quote tweets

- **User Operations**:

  - Get user profiles
  - Follow users
  - Get followers and following lists

- **Grok Integration**:
  - Chat with Grok via Twitter's interface
  - Continue conversations with conversation IDs
  - Get web search results and citations
  - Access Twitter's real-time data through Grok
  - **Note**: Grok functionality requires [agent-twitter-client v0.0.19](https://github.com/elizaOS/agent-twitter-client/releases/tag/0.0.19) or higher

## Documentation

- [Developer Guide](docs/DEVELOPER_GUIDE.md) - Comprehensive guide for developers
- [Testing Guide](docs/TESTING.md) - Instructions for testing the MCP
- [Agent Guide](docs/AGENT_GUIDE.md) - Guide for AI agents on how to use the Twitter MCP
- [Contributing Guide](CONTRIBUTING.md) - Guidelines for contributing to this project
- [Changelog](CHANGELOG.md) - History of changes to this project

## Quick Start

### Installation

```bash
# Install globally
npm install -g agent-twitter-client-mcp

# Or install locally
npm install agent-twitter-client-mcp
```

### Basic Usage

1. Create a `.env` file with your Twitter credentials (see [Authentication Methods](#authentication-methods))
2. Run the MCP server:

```bash
# If installed globally
agent-twitter-client-mcp

# If installed locally
npx agent-twitter-client-mcp
```

### Port Configuration

By default, the MCP server runs on port 3000. If you need to change this (for example, if you already have an application running on port 3000), you have several options:

#### Option 1: Using Environment Variables

Set the `PORT` environment variable:

```bash
PORT=3001 npx agent-twitter-client-mcp
```

#### Option 2: Using Docker Compose

If using Docker Compose, you can configure both the host and container ports in your `.env` file:

```
# .env file
MCP_HOST_PORT=3001    # The port on your host machine
MCP_CONTAINER_PORT=3000  # The port inside the container
```

Then run:

```bash
docker-compose up -d
```

This will map port 3001 on your host to port 3000 in the container, allowing you to access the MCP at http://localhost:3001 while your other application continues to use port 3000.

### Setup with Claude Desktop

1. Configure Claude Desktop to use this MCP by adding to your config file:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "agent-twitter-client-mcp": {
      "command": "npx",
      "args": ["-y", "agent-twitter-client-mcp"],
      "env": {
        "AUTH_METHOD": "cookies",
        "TWITTER_COOKIES": "[\"auth_token=YOUR_AUTH_TOKEN; Domain=.twitter.com\", \"ct0=YOUR_CT0_VALUE; Domain=.twitter.com\", \"twid=u%3DYOUR_USER_ID; Domain=.twitter.com\"]"
      }
    }
  }
}
```

2. Restart Claude Desktop

### Authentication Methods

#### Cookie Authentication (Recommended)

```json
{
  "AUTH_METHOD": "cookies",
  "TWITTER_COOKIES": "[\"auth_token=YOUR_AUTH_TOKEN; Domain=.twitter.com\", \"ct0=YOUR_CT0_VALUE; Domain=.twitter.com\", \"twid=u%3DYOUR_USER_ID; Domain=.twitter.com\"]"
}
```

To obtain cookies:

1. Log in to Twitter in your browser
2. Open Developer Tools (F12)
3. Go to the Application tab > Cookies
4. Copy the values of `auth_token`, `ct0`, and `twid` cookies
5. Make sure to include the `Domain=.twitter.com` part for each cookie

#### Username/Password Authentication

```json
{
  "AUTH_METHOD": "credentials",
  "TWITTER_USERNAME": "your_username",
  "TWITTER_PASSWORD": "your_password",
  "TWITTER_EMAIL": "your_email@example.com", // Optional
  "TWITTER_2FA_SECRET": "your_2fa_secret" // Optional, required if 2FA is enabled
}
```

#### Twitter API Authentication

```json
{
  "AUTH_METHOD": "api",
  "TWITTER_API_KEY": "your_api_key",
  "TWITTER_API_SECRET_KEY": "your_api_secret_key",
  "TWITTER_ACCESS_TOKEN": "your_access_token",
  "TWITTER_ACCESS_TOKEN_SECRET": "your_access_token_secret"
}
```

## Available Tools

- `get_user_tweets`: Fetch tweets from a specific user
- `get_tweet_by_id`: Fetch a specific tweet by ID
- `search_tweets`: Search for tweets
- `send_tweet`: Post a new tweet
- `send_tweet_with_poll`: Post a tweet with a poll
- `like_tweet`: Like a tweet
- `retweet`: Retweet a tweet
- `quote_tweet`: Quote a tweet
- `get_user_profile`: Get a user's profile
- `follow_user`: Follow a user
- `get_followers`: Get a user's followers
- `get_following`: Get users a user is following
- `grok_chat`: Chat with Grok via Twitter
- `health_check`: Check the health of the Twitter MCP server

## Testing Interface

The MCP includes an interactive command-line interface for testing:

```bash
npx agent-twitter-client-mcp-test
# or if installed locally
npm run test:interface
```

This launches a REPL where you can test various MCP functions:

```
agent-twitter-client-mcp> help

Available commands:
  health                     Run a health check
  profile <username>         Get a user profile
  tweets <username> [count]  Get tweets from a user
  tweet <id>                 Get a specific tweet by ID
  search <query> [count]     Search for tweets
  post <text>                Post a new tweet
  like <id>                  Like a tweet
  retweet <id>               Retweet a tweet
  quote <id> <text>          Quote a tweet
  follow <username>          Follow a user
  followers <userId> [count] Get a user's followers
  following <userId> [count] Get users a user is following
  grok <message>             Chat with Grok
  help                       Show available commands
  exit                       Exit the test interface
```

### Example Test Commands

```
# Run a health check
agent-twitter-client-mcp> health

# Search for tweets
agent-twitter-client-mcp> search mcp 2

# Get a user's profile
agent-twitter-client-mcp> profile elonmusk

# Get tweets from a user
agent-twitter-client-mcp> tweets openai 5

# Chat with Grok
agent-twitter-client-mcp> grok Explain quantum computing in simple terms
```

## Example Usage

Ask Claude to:

- "Search Twitter for tweets about AI"
- "Post a tweet saying 'Hello from Claude!'"
- "Get the latest tweets from @OpenAI"
- "Chat with Grok about quantum computing"

## Advanced Usage

### Working with Media

To post a tweet with an image:

```
I want to post a tweet with an image. The tweet should say "Beautiful sunset today!" and include this image.
```

To post a tweet with a video:

```
I want to post a tweet with a video. The tweet should say "Check out this amazing video!" and include the video file.
```

### Creating Polls

To create a poll:

```
Create a Twitter poll asking "What's your favorite programming language?" with options: Python, JavaScript, Rust, and Go. The poll should run for 24 hours.
```

### Interacting with Grok

To have a conversation with Grok:

```
Use Grok to explain quantum computing to me. Ask it to include some real-world applications.
```

To continue a conversation with Grok:

```
Continue the Grok conversation and ask it to elaborate on quantum entanglement.
```

### Grok's Unique Capabilities

Grok on Twitter has access to real-time Twitter data that even the standalone Grok API doesn't have. This means you can ask Grok about:

- Current trending topics on Twitter
- Analysis of recent tweets on specific subjects
- Information about Twitter users and their content
- Real-time events being discussed on the platform

Example:

```
Use Grok to analyze the current sentiment around AI on Twitter.
```

## Troubleshooting

### Authentication Issues

#### Cookie Authentication Problems

If you're experiencing issues with cookie authentication:

1. **Cookie Expiration**: Twitter cookies typically expire after a certain period. Try refreshing your cookies by logging out and back into Twitter.
2. **Cookie Format**: Ensure your cookies are properly formatted as a JSON array of strings with the correct domain.
3. **Required Cookies**: Make sure you've included the essential cookies: `auth_token`, `ct0`, and `twid`.

Example of properly formatted cookies:

```json
"TWITTER_COOKIES": "[\"auth_token=1234567890abcdef; Domain=.twitter.com\", \"ct0=abcdef1234567890; Domain=.twitter.com\", \"twid=u%3D1234567890; Domain=.twitter.com\"]"
```

#### Credential Authentication Problems

If you're having trouble with username/password authentication:

1. **Two-Factor Authentication**: If your account has 2FA enabled, you'll need to provide the `TWITTER_2FA_SECRET`.
2. **Account Lockouts**: Too many failed login attempts may lock your account. Check your email for account verification requests.
3. **Captcha Challenges**: Twitter may present captcha challenges that the client can't handle automatically.

#### API Authentication Problems

For API authentication issues:

1. **API Key Permissions**: Ensure your API keys have the necessary permissions for the actions you're trying to perform.
2. **Rate Limiting**: Twitter API has rate limits that may cause failures if exceeded.
3. **API Changes**: Twitter occasionally changes its API, which may cause compatibility issues.

### Operation Errors

#### Tweet Posting Failures

If you can't post tweets:

1. **Content Restrictions**: Twitter may block tweets that violate its content policies.
2. **Media Format Issues**: Ensure media is properly formatted and encoded.
3. **Rate Limiting**: Twitter limits how frequently you can post.

#### Search Problems

If search isn't working:

1. **Query Syntax**: Ensure your search query follows Twitter's search syntax.
2. **Search Limitations**: Some search modes may have restrictions or require specific permissions.

#### Grok Issues

If Grok functionality isn't working:

1. **Version Requirement**: Grok requires [agent-twitter-client v0.0.19](https://github.com/elizaOS/agent-twitter-client/releases/tag/0.0.19) or higher. The current package uses v0.0.18 for basic functionality.
2. **Authentication**: Grok requires valid Twitter authentication. Cookie authentication is recommended.
3. **Rate Limits**: Grok has rate limits (typically 25 messages per 2 hours for non-premium accounts).
4. **API Changes**: Twitter may change the Grok API endpoints or authentication requirements.

### Server Issues

#### Health Check

Use the `health_check` tool to diagnose server issues:

```
Run a health check on the agent-twitter-client-mcp server to diagnose any issues.
```

The health check will report on:

- Authentication status
- API connectivity
- Memory usage

#### Logging

The server logs to both console and files:

- `error.log`: Contains error-level messages
- `combined.log`: Contains all log messages

Check these logs for detailed error information.

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

1. Clone the repository

```bash
git clone https://github.com/ryanmac/agent-twitter-client-mcp.git
cd agent-twitter-client-mcp
```

2. Install dependencies

```bash
npm install
```

3. Create a `.env` file with configuration:

```
AUTH_METHOD=cookies
TWITTER_COOKIES=["cookie1=value1", "cookie2=value2"]
```

4. Build the project

```bash
npm run build
```

5. Start the server

```bash
npm start
```

### Environment Variables

In addition to the authentication variables, you can set:

- `LOG_LEVEL`: Set logging level (error, warn, info, debug)
- `NODE_ENV`: Set environment (development, production)

## Docker

You can also run the server using Docker:

### Using Docker Directly

```bash
# Build the Docker image
docker build -t agent-twitter-client-mcp .

# Run the container with environment variables
docker run -p 3000:3000 \
  -e AUTH_METHOD=cookies \
  -e TWITTER_COOKIES='["auth_token=YOUR_AUTH_TOKEN; Domain=.twitter.com", "ct0=YOUR_CT0_VALUE; Domain=.twitter.com"]' \
  agent-twitter-client-mcp
```

### Using Docker Compose

1. Create a `.env` file with your Twitter credentials
2. Run with docker-compose:

```bash
# Start the service
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the service
docker-compose down
```

### Environment Variables in Docker

You can pass environment variables to the Docker container in several ways:

1. **In the docker-compose.yml file** (already configured)
2. **Through a .env file** (recommended for docker-compose)
3. **Directly in the docker run command** (as shown above)

### Persisting Logs

The docker-compose configuration includes a volume mount for logs:

```yaml
volumes:
  - ./logs:/app/logs
```

This will store logs in a `logs` directory in your project folder.

## Security Considerations

- **Credential Storage**: Store credentials securely, preferably using environment variables or a secure vault.
- **Rate Limiting**: Implement rate limiting to prevent abuse of the Twitter API.
- **Content Validation**: Validate all content before posting to prevent malicious use.

## License

MIT
