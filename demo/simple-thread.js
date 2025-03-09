import readlineSync from "readline-sync";
import { McpClient } from "./mcp-client.js";
import { threadTweets } from "./tweets.js";
import fs from "fs";

async function main() {
  let client = null;

  try {
    console.log("Starting MCP client...");

    // Create a new client with a different port to avoid conflicts
    client = new McpClient({
      port: 3007, // Use a different port than the default
      debug: process.env.DEBUG === "true",
      maxPortAttempts: 5,
      portIncrement: 1,
      startServer: true, // Always start a new server
    });

    await client.start();
    console.log("MCP client started successfully!");

    // Display thread options
    console.log("\n=== Twitter Thread Creator ===\n");

    console.log("Options:");
    console.log("[1] Use pre-defined thread");
    console.log("[2] Create custom thread");

    const threadOption = readlineSync.question("\nSelect option (1 or 2): ");

    let tweets = [];

    if (threadOption === "1") {
      // Use pre-defined thread
      console.log("\nPre-defined thread:");
      threadTweets.forEach((tweet, index) => {
        console.log(`\n[${index + 1}] ${tweet}`);
        console.log(`Length: ${tweet.length} characters`);
      });

      if (readlineSync.keyInYNStrict("\nUse this thread?")) {
        tweets = [...threadTweets];
      } else {
        console.log("Thread cancelled. Exiting...");
        await client.stop();
        return;
      }
    } else if (threadOption === "2") {
      // Create custom thread
      console.log("\nCreate your custom thread:");
      console.log(
        "Enter each tweet in the thread. Enter an empty line when done."
      );

      let tweetNumber = 1;
      let continueAdding = true;
      while (continueAdding) {
        const tweet = readlineSync.question(
          `\nTweet #${tweetNumber} (max 280 chars, empty to finish): `
        );

        if (!tweet.trim()) {
          continueAdding = false;
          continue;
        }

        if (tweet.length > 280) {
          console.log(
            `Tweet is too long (${tweet.length} characters). Maximum is 280 characters.`
          );
          console.log("Please try again with a shorter tweet.");
          continue;
        }

        tweets.push(tweet);
        tweetNumber++;
      }

      if (tweets.length === 0) {
        console.log("No tweets entered. Exiting...");
        await client.stop();
        return;
      }

      console.log(`\nCreated thread with ${tweets.length} tweets.`);
    } else {
      console.log("Invalid option. Exiting...");
      await client.stop();
      return;
    }

    // Confirm before sending
    console.log("\nReady to send thread with the following tweets:");
    tweets.forEach((tweet, index) => {
      console.log(`\n[${index + 1}] ${tweet}`);
    });

    if (!readlineSync.keyInYNStrict("\nSend this thread?")) {
      console.log("Thread cancelled. Exiting...");
      await client.stop();
      return;
    }

    console.log("\nSending thread...");

    // Send the first tweet
    let previousTweetId = null;

    for (let i = 0; i < tweets.length; i++) {
      const tweet = tweets[i];
      console.log(`\nSending tweet ${i + 1} of ${tweets.length}...`);

      try {
        // Create a direct JSON-RPC request
        const requestId = Math.floor(Math.random() * 10000);

        const request = {
          jsonrpc: "2.0",
          id: requestId.toString(),
          method: "tools/call",
          params: {
            name: "send_tweet",
            arguments: {
              text: tweet,
            },
          },
        };

        // Add replyToTweetId if this is not the first tweet
        if (previousTweetId) {
          request.params.arguments.replyToTweetId = previousTweetId;
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
                      contentText.match(/id['"]?\s*:\s*['"]?(\d+)/i);
                    if (idMatch && idMatch[1]) {
                      resolve({ id: idMatch[1], text: tweet });
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
              // assume the tweet was sent successfully but we can't continue the thread
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

        console.log(`✅ Tweet ${i + 1} sent successfully!`);

        if (result.id && result.id !== "unknown") {
          console.log("Tweet ID:", result.id);
          console.log(
            "Tweet URL:",
            `https://twitter.com/user/status/${result.id}`
          );

          // Save the tweet ID for the next tweet in the thread
          previousTweetId = result.id;

          // Save the last tweet ID for future replies
          if (i === tweets.length - 1) {
            fs.writeFileSync("./last-tweet-id.txt", result.id);
            console.log("Last tweet ID saved for future replies.");
          }
        } else {
          console.log("Note: Tweet ID not returned in the response.");
          console.log(
            "The tweet was likely sent successfully, but we couldn't extract the ID."
          );
          console.log(
            "This means we can't properly thread the remaining tweets."
          );

          if (i < tweets.length - 1) {
            if (
              !readlineSync.keyInYNStrict(
                "Continue sending tweets as individual tweets (not threaded)?"
              )
            ) {
              console.log("Thread cancelled. Exiting...");
              break;
            }
            previousTweetId = null; // Reset so remaining tweets aren't threaded
          }
        }

        // Add a delay between tweets to avoid rate limiting
        if (i < tweets.length - 1) {
          const delaySeconds = 2;
          console.log(
            `Waiting ${delaySeconds} seconds before sending next tweet...`
          );
          await new Promise((resolve) =>
            setTimeout(resolve, delaySeconds * 1000)
          );
        }
      } catch (error) {
        console.error(
          `\n❌ ERROR: Failed to send tweet ${i + 1}: ${error.message}`
        );

        // Check for character limit error
        if (error.message.includes("cannot exceed 280 characters")) {
          console.log("\nThe tweet exceeds Twitter's 280 character limit.");
          console.log("Current length:", tweet.length, "characters");
        }

        // Check for authentication errors
        if (
          error.message.includes("authentication") ||
          error.message.includes("auth") ||
          error.message.includes("login") ||
          error.message.includes("credentials")
        ) {
          console.log("\nThere seems to be an authentication issue.");
          console.log(
            "Please check your Twitter credentials in the .env file."
          );
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
          console.error(
            "Error details:",
            JSON.stringify(error.details, null, 2)
          );
        }

        if (
          !readlineSync.keyInYNStrict("Continue with the rest of the thread?")
        ) {
          console.log("Thread cancelled. Exiting...");
          break;
        }
      }
    }

    console.log("\nThread complete!");

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
