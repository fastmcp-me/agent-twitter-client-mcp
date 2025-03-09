import readlineSync from "readline-sync";
import { McpClient } from "./mcp-client.js";
import { singleTweets } from "./tweets.js";
import fs from "fs";

async function main() {
  let client = null;

  try {
    console.log("Starting MCP client...");

    // Create a new client with a different port to avoid conflicts
    client = new McpClient({
      port: 3005, // Use a different port than the default
      debug: process.env.DEBUG === "true",
      maxPortAttempts: 5,
      portIncrement: 1,
      startServer: true, // Always start a new server
    });

    await client.start();
    console.log("MCP client started successfully!");

    // Display available tweets
    console.log("\nAvailable tweets:");

    // Only show the shorter tweets (6 and 7) to avoid character limit issues
    const shortTweets = singleTweets.slice(5); // Get tweets 6 and 7
    shortTweets.forEach((tweet, index) => {
      console.log(`\n[${index + 1}] ${tweet}\n`);
      console.log(`Length: ${tweet.length} characters`);
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
      selectedTweet = readlineSync.question(
        "\nEnter your tweet text (max 280 characters): "
      );
      if (!selectedTweet.trim()) {
        console.log("Empty tweet. Exiting...");
        await client.stop();
        return;
      }

      // Check character count
      if (selectedTweet.length > 280) {
        console.log(
          `Tweet is too long (${selectedTweet.length} characters). Maximum is 280 characters.`
        );
        console.log("Please try again with a shorter tweet.");
        await client.stop();
        return;
      }
    } else {
      const tweetIndex = parseInt(selection) - 1;

      if (
        isNaN(tweetIndex) ||
        tweetIndex < 0 ||
        tweetIndex >= shortTweets.length
      ) {
        console.log("Invalid selection. Exiting...");
        await client.stop();
        return;
      }

      selectedTweet = shortTweets[tweetIndex];
    }

    console.log(`\nSending tweet: "${selectedTweet}"\n`);
    console.log(`Tweet length: ${selectedTweet.length} characters`);

    // Ask if this is a reply
    const isReply = readlineSync.keyInYNStrict(
      "Is this a reply to another tweet?"
    );
    let replyToTweetId = null;

    if (isReply) {
      replyToTweetId = readlineSync.question(
        "Enter the tweet ID to reply to: "
      );
      if (!replyToTweetId.trim()) {
        console.log("No tweet ID provided. Sending as a regular tweet...");
        replyToTweetId = null;
      }
    }

    // Send the tweet
    try {
      console.log("Sending tweet to Twitter...");

      // Create a direct JSON-RPC request for better control
      const requestId = Math.floor(Math.random() * 10000);

      const request = {
        jsonrpc: "2.0",
        id: requestId.toString(),
        method: "tools/call",
        params: {
          name: "send_tweet",
          arguments: {
            text: selectedTweet,
          },
        },
      };

      // Add replyToTweetId if provided
      if (replyToTweetId) {
        request.params.arguments.replyToTweetId = replyToTweetId;
        console.log(
          `This tweet will be a reply to tweet ID: ${replyToTweetId}`
        );
      }

      if (process.env.DEBUG === "true") {
        console.log(
          "DEBUG: Request payload:",
          JSON.stringify(request, null, 2)
        );
      }

      // Register a response handler
      const tweetPromise = new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error("Timeout waiting for response from Twitter"));
        }, 30000); // 30 second timeout

        client.responseHandlers.set(requestId.toString(), (response) => {
          clearTimeout(timeoutId);

          if (process.env.DEBUG === "true") {
            console.log(
              "DEBUG: Raw response:",
              JSON.stringify(response, null, 2)
            );
          }

          // Check for error in the response content
          if (
            response.result &&
            response.result.content &&
            response.result.content.length > 0 &&
            response.result.content[0].isError
          ) {
            const errorMessage =
              response.result.content[0].text || "Unknown error in response";
            reject(new Error(errorMessage));
            return;
          }

          // Check for standard error format
          if (response.error) {
            reject(new Error(response.error.message || "Unknown error"));
            return;
          }

          // If we get here, the tweet was sent successfully
          if (
            response.result &&
            response.result.content &&
            response.result.content.length > 0
          ) {
            try {
              // Try to parse the tweet data from the response
              const contentText = response.result.content[0].text;
              if (contentText) {
                try {
                  const tweetData = JSON.parse(contentText);
                  if (tweetData && tweetData.tweet && tweetData.tweet.id) {
                    resolve(tweetData.tweet);
                    return;
                  } else if (tweetData && tweetData.success) {
                    // Some versions might return a success flag instead of tweet data
                    resolve({ id: "unknown", success: true });
                    return;
                  }
                } catch (parseError) {
                  console.log(
                    "Warning: Failed to parse tweet data:",
                    parseError.message
                  );
                  // Try to extract tweet ID using regex if JSON parsing fails
                  const idMatch =
                    contentText.match(/tweet ID: (\d+)/i) ||
                    contentText.match(/id["']?\s*:\s*["']?(\d+)/i);
                  if (idMatch && idMatch[1]) {
                    resolve({ id: idMatch[1], text: selectedTweet });
                    return;
                  }
                }
              }
            } catch (error) {
              console.log(
                "Warning: Exception while processing response:",
                error.message
              );
            }

            // If we couldn't extract the tweet data but got a successful response,
            // assume the tweet was sent successfully
            if (
              response.result.status === "success" ||
              (response.result.content &&
                response.result.content[0].text &&
                !response.result.content[0].isError)
            ) {
              resolve({ id: "unknown", success: true });
              return;
            }

            reject(new Error("Failed to extract tweet ID from response"));
          } else {
            reject(new Error("Invalid response from MCP server"));
          }
        });

        // Send the request
        client.sendRequest(request);
      });

      const result = await tweetPromise;

      console.log("\n✅ Tweet sent successfully!");

      if (result.id && result.id !== "unknown") {
        console.log("Tweet ID:", result.id);
        console.log(
          "Tweet URL:",
          `https://twitter.com/user/status/${result.id}`
        );

        // Save the tweet ID for future replies
        fs.writeFileSync("./last-tweet-id.txt", result.id);
        console.log("Tweet ID saved for future replies.");
      } else {
        console.log("Note: Tweet ID not returned in the response.");
        console.log(
          "The tweet was likely sent successfully, but we couldn't extract the ID."
        );
        console.log("Please check your Twitter account to confirm.");
      }
    } catch (error) {
      console.error("\n❌ ERROR: Failed to send tweet:", error.message);

      // Check for character limit error
      if (error.message.includes("cannot exceed 280 characters")) {
        console.log("\nThe tweet exceeds Twitter's 280 character limit.");
        console.log("Current length:", selectedTweet.length, "characters");
        console.log("Please edit your tweet to be shorter.");
      }

      // Check for authentication errors
      if (
        error.message.includes("authentication") ||
        error.message.includes("auth") ||
        error.message.includes("login") ||
        error.message.includes("credentials")
      ) {
        console.log("\nThere seems to be an authentication issue.");
        console.log("Please check your Twitter credentials in the .env file.");
        console.log("You may need to refresh your cookies or re-authenticate.");
      }

      // Check for rate limiting
      if (
        error.message.includes("rate limit") ||
        error.message.includes("too many requests")
      ) {
        console.log("\nYou've hit Twitter's rate limits.");
        console.log("Please wait a while before trying again.");
      }

      if (error.details) {
        console.error("Error details:", JSON.stringify(error.details, null, 2));
      }
    }

    // Clean up
    console.log("\nCleaning up...");
    await client.stop();
    console.log("Done!");
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
