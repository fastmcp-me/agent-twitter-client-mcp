import readlineSync from "readline-sync";
import { McpClient } from "./mcp-client.js";
import { singleTweets } from "./tweets.js";
import fs from "fs";

// Function to fetch information about a tweet by ID
async function fetchTweetInfo(client, tweetId) {
  return new Promise((resolve, reject) => {
    try {
      // Create the request in JSON-RPC 2.0 format
      const requestId = Math.floor(Math.random() * 10000);

      const request = {
        jsonrpc: "2.0",
        id: requestId.toString(),
        method: "tools/call",
        params: {
          name: "get_tweet_by_id",
          arguments: {
            id: tweetId,
          },
        },
      };

      // Register response handler
      client.responseHandlers.set(requestId.toString(), (response) => {
        if (
          response.result &&
          response.result.content &&
          response.result.content.length > 0
        ) {
          try {
            // Parse the nested JSON string
            const tweetData = JSON.parse(response.result.content[0].text);
            if (tweetData && tweetData.tweet) {
              resolve(tweetData.tweet);
            } else {
              reject(new Error("Invalid tweet data format"));
            }
          } catch (parseError) {
            reject(parseError);
          }
        } else if (response.error) {
          reject(new Error(response.error.message || "Unknown error"));
        } else {
          reject(new Error("Invalid response from MCP server"));
        }
      });

      // Send the request
      client.sendRequest(request);
    } catch (error) {
      reject(error);
    }
  });
}

async function main() {
  let client = null;

  try {
    console.log("Starting MCP client...");
    client = new McpClient({
      port: process.env.PORT ? parseInt(process.env.PORT) : 3001,
      debug: process.env.DEBUG === "true",
      maxPortAttempts: 5,
      portIncrement: 1,
      startServer: process.env.START_SERVER !== "false", // Start server by default
    });

    await client.start();
    console.log("MCP client started successfully!");

    // Display available tweets
    console.log("\nAvailable tweets:");
    singleTweets.forEach((tweet, index) => {
      console.log(`\n[${index + 1}] ${tweet}\n`);
    });

    console.log(`\n[c] Custom tweet\n`);

    // Get user selection
    const selection = readlineSync.question(
      "\nEnter the number of the tweet to send, 'c' for custom tweet, or 'q' to quit: "
    );

    if (selection.toLowerCase() === "q") {
      console.log("Exiting...");
      await client.stop();
      return;
    }

    let selectedTweet;

    if (selection.toLowerCase() === "c") {
      // Get custom tweet text
      selectedTweet = readlineSync.question("\nEnter your tweet text: ");
      if (!selectedTweet.trim()) {
        console.log("Empty tweet. Exiting...");
        await client.stop();
        return;
      }
    } else {
      const tweetIndex = parseInt(selection) - 1;

      if (
        isNaN(tweetIndex) ||
        tweetIndex < 0 ||
        tweetIndex >= singleTweets.length
      ) {
        console.log("Invalid selection. Exiting...");
        await client.stop();
        return;
      }

      selectedTweet = singleTweets[tweetIndex];
    }

    console.log(`\nSending tweet: "${selectedTweet}"\n`);

    // Check if there's a saved tweet ID for replying
    let savedTweetId = null;
    try {
      if (fs.existsSync("./last-tweet-id.txt")) {
        savedTweetId = fs.readFileSync("./last-tweet-id.txt", "utf8").trim();
        console.log(`Found saved tweet ID: ${savedTweetId}`);

        // Try to get more information about the tweet
        try {
          console.log("Fetching information about the saved tweet...");
          const tweetInfo = await fetchTweetInfo(client, savedTweetId);
          if (tweetInfo) {
            console.log(
              `Tweet by: ${tweetInfo.author.name} (@${tweetInfo.author.username})`
            );
            console.log(
              `Tweet text: "${tweetInfo.text.substring(0, 50)}${
                tweetInfo.text.length > 50 ? "..." : ""
              }"`
            );
          }
        } catch (tweetInfoError) {
          console.log(
            "Could not fetch additional information about the saved tweet."
          );
        }
      }
    } catch (error) {
      console.log("No saved tweet ID found.");
    }

    // Ask if this is a reply
    let isReply = false;
    if (savedTweetId) {
      isReply = readlineSync.keyInYNStrict(
        `Would you like to reply to the saved tweet (ID: ${savedTweetId})?`
      );
    }

    if (!isReply) {
      isReply = readlineSync.keyInYNStrict("Is this a reply to another tweet?");
    }

    let replyToTweetId = null;
    if (isReply) {
      if (
        savedTweetId &&
        readlineSync.keyInYNStrict("Use the saved tweet ID?")
      ) {
        replyToTweetId = savedTweetId;
      } else {
        replyToTweetId = readlineSync.question(
          "Enter the tweet ID to reply to: "
        );
        if (!replyToTweetId.trim()) {
          console.log("No tweet ID provided. Sending as a regular tweet...");
          replyToTweetId = null;
        }
      }
    }

    // Send the tweet
    try {
      const result = await client.sendTweet(selectedTweet, replyToTweetId);
      console.log("Tweet sent successfully!");

      if (result && result.id) {
        console.log("Tweet ID:", result.id);
        console.log(
          "Tweet URL:",
          `https://twitter.com/user/status/${result.id}`
        );

        // Ask if user wants to save this tweet ID for future replies
        if (
          readlineSync.keyInYNStrict(
            "Would you like to save this tweet ID for future replies?"
          )
        ) {
          try {
            fs.writeFileSync("./last-tweet-id.txt", result.id);
            console.log(`Tweet ID saved to ./last-tweet-id.txt`);
          } catch (fsError) {
            console.error("Error saving tweet ID to file:", fsError.message);
          }
        }
      } else {
        console.log("Note: Tweet ID not returned in the response.");
      }
    } catch (error) {
      console.error("Error sending tweet:", error.message);
      if (error.details) {
        console.error("Error details:", JSON.stringify(error.details, null, 2));
      }
    }

    // Clean up
    await client.stop();
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
