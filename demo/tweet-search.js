import readlineSync from "readline-sync";
import { McpClient } from "./mcp-client.js";
import dotenv from "dotenv";
import fs from "fs";

// Load environment variables
dotenv.config();

async function searchUserTweets(client, username, count = 3) {
  console.log(`\nSearching for tweets from @${username}...`);

  return new Promise((resolve, reject) => {
    try {
      // Create the request in JSON-RPC 2.0 format
      const requestId = Math.floor(Math.random() * 10000);

      const request = {
        jsonrpc: "2.0",
        id: requestId.toString(),
        method: "tools/call",
        params: {
          name: "get_user_tweets",
          arguments: {
            username: username,
            count: count,
            includeReplies: false,
            includeRetweets: true,
          },
        },
      };

      if (client.options.debug) {
        console.log("Sending request:", JSON.stringify(request, null, 2));
      }

      // Register response handler
      client.responseHandlers.set(requestId.toString(), (response) => {
        if (response.result) {
          resolve(response.result);
        } else if (response.error) {
          console.error(
            "ERROR: Error searching tweets:",
            response.error.message || "Unknown error"
          );
          reject(new Error(response.error.message || "Unknown error"));
        } else {
          console.error("ERROR: Invalid response from MCP server");
          reject(new Error("Invalid response from MCP server"));
        }
      });

      // Send the request
      client.sendRequest(request);
    } catch (error) {
      console.error("ERROR: Exception in searchUserTweets:", error);
      reject(error);
    }
  });
}

function displayTweets(result) {
  try {
    // The response contains a nested JSON string in the text field
    if (
      result &&
      result.content &&
      result.content.length > 0 &&
      result.content[0].text
    ) {
      // Parse the nested JSON string
      const tweetData = JSON.parse(result.content[0].text);

      if (!tweetData || !tweetData.tweets || tweetData.tweets.length === 0) {
        console.log("No tweets found.");
        return;
      }

      console.log(
        `\nFound ${tweetData.tweets.length} tweets from @${tweetData.username}:\n`
      );

      tweetData.tweets.forEach((tweet, index) => {
        console.log(`[${index + 1}] Tweet ID: ${tweet.id}`);
        console.log(
          `    Author: ${tweet.author.name} (@${tweet.author.username})`
        );
        console.log(
          `    Created at: ${new Date(tweet.createdAt).toLocaleString()}`
        );
        console.log(`    Text: ${tweet.text}`);

        if (tweet.metrics) {
          console.log(
            `    Likes: ${tweet.metrics.likes}, Retweets: ${tweet.metrics.retweets}, Replies: ${tweet.metrics.replies}`
          );
        }

        if (
          tweet.media &&
          tweet.media.photos &&
          tweet.media.photos.length > 0
        ) {
          console.log(`    Photos: ${tweet.media.photos.length}`);
        }

        if (tweet.isRetweet) {
          console.log(`    Type: Retweet`);
        } else if (tweet.isReply) {
          console.log(`    Type: Reply`);
        } else if (tweet.isQuote) {
          console.log(`    Type: Quote Tweet`);
          if (tweet.quotedTweet) {
            console.log(
              `    Quoted Tweet: "${tweet.quotedTweet.text.substring(
                0,
                50
              )}..."`
            );
          }
        }

        console.log(`    URL: ${tweet.permanentUrl}`);
        console.log();
      });

      return tweetData;
    } else {
      console.log("No tweets found in the response.");
      return null;
    }
  } catch (error) {
    console.error("Error parsing tweet data:", error);
    console.log("Raw response:", JSON.stringify(result, null, 2));
    return null;
  }
}

async function main() {
  let client = null;

  try {
    console.log("Starting Tweet Search Demo...");

    // Create a new McpClient instance
    client = new McpClient({
      port: process.env.PORT ? parseInt(process.env.PORT) : 3001,
      debug: process.env.DEBUG === "true",
      maxPortAttempts: 5,
      portIncrement: 1,
      startServer: process.env.START_SERVER !== "false", // Start server by default
    });

    // Start the client
    console.log("Starting MCP client...");
    await client.start();
    console.log("MCP client started successfully!");

    // List available tools to verify get_user_tweets is available
    console.log("\nListing available tools...");
    const tools = await client.listTools();

    const availableTools =
      tools && tools.tools ? tools.tools.map((tool) => tool.name) : [];

    console.log("Available tools:", availableTools);

    if (!availableTools.includes("get_user_tweets")) {
      console.error("ERROR: The 'get_user_tweets' tool is not available.");
      await client.stop();
      return;
    }

    // Predefined users
    const predefinedUsers = ["doge", "elonmusk", "elizaos"];

    // Ask user to choose a search method
    console.log("\nHow would you like to search for tweets?");
    const searchOptions = [
      "Search for a specific Twitter username",
      "Choose from predefined users",
    ];

    const searchChoice = readlineSync.keyInSelect(
      searchOptions,
      "Select an option:"
    );

    if (searchChoice === -1) {
      console.log("Search cancelled. Exiting...");
      await client.stop();
      return;
    }

    let username;

    if (searchChoice === 0) {
      // User wants to enter a specific username
      username = readlineSync.question("Enter Twitter username (without @): ");

      if (!username.trim()) {
        console.log("No username provided. Exiting...");
        await client.stop();
        return;
      }
    } else {
      // User wants to choose from predefined users
      console.log("\nChoose a user to search for:");
      const userChoice = readlineSync.keyInSelect(
        predefinedUsers,
        "Select a user:"
      );

      if (userChoice === -1) {
        console.log("No user selected. Exiting...");
        await client.stop();
        return;
      }

      username = predefinedUsers[userChoice];
    }

    // Ask for number of tweets to retrieve
    const countOptions = ["3 tweets", "5 tweets", "10 tweets"];
    const countChoice = readlineSync.keyInSelect(
      countOptions,
      "How many tweets would you like to retrieve?"
    );

    if (countChoice === -1) {
      console.log("No count selected. Exiting...");
      await client.stop();
      return;
    }

    const counts = [3, 5, 10];
    const count = counts[countChoice];

    // Search for tweets
    try {
      const result = await searchUserTweets(client, username, count);
      const displayResult = displayTweets(result);

      // Ask if user wants to save a tweet ID for later use
      if (
        displayResult &&
        displayResult.tweets &&
        displayResult.tweets.length > 0
      ) {
        const saveTweetId = readlineSync.keyInYNStrict(
          "Would you like to save a tweet ID for replying later?"
        );

        if (saveTweetId) {
          const tweetIndex = readlineSync.question(
            `Enter the number of the tweet to save (1-${displayResult.tweets.length}): `,
            {
              limit: (input) => {
                const num = parseInt(input);
                return num > 0 && num <= displayResult.tweets.length;
              },
              limitMessage: `Please enter a number between 1 and ${displayResult.tweets.length}.`,
            }
          );

          const selectedTweet = displayResult.tweets[parseInt(tweetIndex) - 1];
          console.log(`\nSaved tweet ID: ${selectedTweet.id}`);
          console.log(
            `You can use this ID to reply to the tweet using the send-tweet.js script.`
          );

          // Write to a file for later use
          try {
            fs.writeFileSync("./last-tweet-id.txt", selectedTweet.id);
            console.log(`Tweet ID saved to ./last-tweet-id.txt`);

            // Also display the tweet URL for easy access
            console.log(`Tweet URL: ${selectedTweet.permanentUrl}`);
          } catch (fsError) {
            console.error("Error saving tweet ID to file:", fsError.message);
            console.log(
              `Please note this tweet ID for later use: ${selectedTweet.id}`
            );
            console.log(`Tweet URL: ${selectedTweet.permanentUrl}`);
          }
        }
      }
    } catch (error) {
      console.error("Error searching for tweets:", error.message);
      if (error.details) {
        console.error("Error details:", JSON.stringify(error.details, null, 2));
      }
    }

    // Clean up
    await client.stop();
    console.log("MCP client stopped");
  } catch (error) {
    console.error("Error:", error);
    if (client) {
      try {
        await client.stop();
      } catch (stopError) {
        console.error("Error stopping client:", stopError);
      }
    }
    process.exit(1);
  }
}

main();
