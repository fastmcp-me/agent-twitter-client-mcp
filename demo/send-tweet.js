import readlineSync from "readline-sync";
import { McpClient } from "./mcp-client.js";
import { singleTweets } from "./tweets.js";
import fs from "fs";

// Function to fetch information about a tweet by ID
async function fetchTweetInfo(client, tweetId) {
  // Skip tweet info fetching if we're in debug mode to avoid EPIPE errors
  if (process.env.DEBUG === "true") {
    console.log(
      "DEBUG mode: Skipping tweet info fetch to avoid potential EPIPE errors"
    );
    return null;
  }

  return new Promise((resolve, _reject) => {
    // Set a timeout to avoid hanging if there's no response
    const timeoutId = setTimeout(() => {
      console.log(
        "Timeout while fetching tweet info. Continuing without tweet details."
      );
      resolve(null);
    }, 3000);

    try {
      // Check if the client is still connected before sending the request
      if (
        (client.options.startServer &&
          (!client.mcpProcess ||
            client.mcpProcess.killed ||
            client.mcpProcess.exitCode !== null ||
            !client.mcpProcess.stdin ||
            !client.mcpProcess.stdin.writable)) ||
        (!client.options.startServer &&
          (!client.socket || !client.socket.writable))
      ) {
        console.log(
          "Warning: MCP connection is not available. Cannot fetch tweet info."
        );
        clearTimeout(timeoutId);
        resolve(null);
        return;
      }

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
        clearTimeout(timeoutId);

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
              console.log("Invalid tweet data format");
              resolve(null);
            }
          } catch (parseError) {
            console.log(`Error parsing tweet data: ${parseError.message}`);
            resolve(null);
          }
        } else if (response.error) {
          console.log(
            `Error from server: ${response.error.message || "Unknown error"}`
          );
          resolve(null);
        } else {
          console.log("Invalid response from MCP server");
          resolve(null);
        }
      });

      // Send the request with error handling
      try {
        client.sendRequest(request);
      } catch (sendError) {
        console.log(
          `Error sending request to fetch tweet info: ${sendError.message}`
        );
        clearTimeout(timeoutId);
        resolve(null);
      }
    } catch (error) {
      console.log(`Error in fetchTweetInfo: ${error.message}`);
      clearTimeout(timeoutId);
      resolve(null);
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
      // Calculate character count
      const charCount = tweet.length;
      const countDisplay =
        charCount <= 280
          ? `${charCount}/280 characters`
          : `⚠️ ${charCount}/280 characters (exceeds limit)`;

      console.log(`\n[${index + 1}] ${tweet}\n`);
      console.log(`Length: ${countDisplay}`);
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

      // Add character limit validation
      if (selectedTweet.length > 280) {
        console.log("\nThe tweet exceeds Twitter's 280 character limit.");
        console.log("Current length:", selectedTweet.length, "characters");
        console.log("Please edit your tweet to be shorter.");
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

      // Add character limit validation for predefined tweets too
      if (selectedTweet.length > 280) {
        console.log(
          "\nThe selected tweet exceeds Twitter's 280 character limit."
        );
        console.log("Current length:", selectedTweet.length, "characters");
        console.log("Please select a different tweet or enter a custom tweet.");
        await client.stop();
        return;
      }
    }

    console.log(`\nSending tweet: "${selectedTweet}"\n`);

    // Check if there's a saved tweet ID for replying
    let savedTweetId = null;
    let shouldUseSavedTweetId = false;

    // In debug mode, skip reading the saved tweet ID to avoid potential EPIPE errors
    if (process.env.DEBUG !== "true") {
      try {
        if (fs.existsSync("./last-tweet-id.txt")) {
          try {
            savedTweetId = fs
              .readFileSync("./last-tweet-id.txt", "utf8")
              .trim();
            if (savedTweetId) {
              console.log(`Found saved tweet ID: ${savedTweetId}`);

              // Only try to fetch tweet info if we have a valid ID
              if (savedTweetId.match(/^\d+$/)) {
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
                    shouldUseSavedTweetId = true;
                  } else {
                    console.log(
                      "Could not fetch information about the saved tweet."
                    );
                    savedTweetId = null;
                  }
                } catch (tweetInfoError) {
                  console.log(
                    "Could not fetch additional information about the saved tweet."
                  );
                  console.log(`Error: ${tweetInfoError.message}`);
                  // We'll still allow using the saved ID even if we can't fetch info about it
                  shouldUseSavedTweetId = true;
                }
              } else {
                console.log("Saved tweet ID is not valid. Ignoring it.");
                savedTweetId = null;
              }
            } else {
              console.log("Saved tweet ID file is empty.");
              savedTweetId = null;
            }
          } catch (readError) {
            console.log(`Error reading saved tweet ID: ${readError.message}`);
            savedTweetId = null;
          }
        }
      } catch (error) {
        console.log("No saved tweet ID found or error reading the file.");
        console.log(`Error: ${error.message}`);
        savedTweetId = null;
      }
    } else {
      console.log(
        "DEBUG mode: Skipping saved tweet ID handling to avoid potential EPIPE errors"
      );
    }

    // Ask if this is a reply
    let isReply = false;
    if (shouldUseSavedTweetId && savedTweetId) {
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

      // When replying, Twitter adds some metadata that counts toward the character limit
      // Typically this is the "@username" of the person you're replying to
      // Let's estimate this as 15 characters to be safe
      const estimatedReplyMetadataLength = 15;
      if (selectedTweet.length + estimatedReplyMetadataLength > 280) {
        console.log(
          "\nWARNING: Your reply may exceed Twitter's character limit when the username is added."
        );
        console.log(
          "Current tweet length:",
          selectedTweet.length,
          "characters"
        );
        console.log(
          "Estimated total with reply metadata:",
          selectedTweet.length + estimatedReplyMetadataLength,
          "characters"
        );
        console.log("Maximum allowed:", 280, "characters");

        if (!readlineSync.keyInYNStrict("Do you want to continue anyway?")) {
          console.log("Aborting tweet. Please edit your tweet to be shorter.");
          await client.stop();
          return;
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
        console.log("The tweet may not have been sent successfully.");
        console.log("Please check your Twitter account to confirm.");
      }
    } catch (error) {
      console.error("\nERROR: Failed to send tweet:", error.message);

      // Check for character limit error
      if (error.message.includes("cannot exceed 280 characters")) {
        console.log("\nThe tweet exceeds Twitter's 280 character limit.");
        console.log("Current length:", selectedTweet.length, "characters");
        console.log("Please edit your tweet to be shorter.");
      }

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
