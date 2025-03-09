import readlineSync from "readline-sync";
import { McpClient } from "./mcp-client.js";
import fs from "fs";

async function main() {
  let client = null;

  try {
    console.log("Starting MCP client...");

    // Create a new client with a different port to avoid conflicts
    client = new McpClient({
      port: 3006, // Use a different port than the default
      debug: process.env.DEBUG === "true",
      maxPortAttempts: 5,
      portIncrement: 1,
      startServer: true, // Always start a new server
    });

    await client.start();
    console.log("MCP client started successfully!");

    // Get search parameters
    console.log("\n=== Twitter Search ===\n");

    // Ask for search type
    console.log("Search options:");
    console.log("[1] Search by username (get user's tweets)");
    console.log("[2] Search by keyword (search all tweets)");

    const searchType = readlineSync.question("\nSelect search type (1 or 2): ");

    if (searchType === "1") {
      // Search by username
      const username = readlineSync.question(
        "\nEnter Twitter username to search (without @): "
      );
      if (!username.trim()) {
        console.log("No username provided. Exiting...");
        await client.stop();
        return;
      }

      const count = readlineSync.question(
        "Number of tweets to retrieve (default: 5): "
      );
      const tweetCount = parseInt(count) || 5;

      const includeReplies = readlineSync.keyInYNStrict("Include replies?");
      const includeRetweets = readlineSync.keyInYNStrict("Include retweets?");

      console.log(`\nSearching for ${tweetCount} tweets from @${username}...`);
      console.log(`Including replies: ${includeReplies ? "Yes" : "No"}`);
      console.log(`Including retweets: ${includeRetweets ? "Yes" : "No"}`);

      try {
        // Create a direct JSON-RPC request
        const requestId = Math.floor(Math.random() * 10000);

        const request = {
          jsonrpc: "2.0",
          id: requestId.toString(),
          method: "tools/call",
          params: {
            name: "get_user_tweets",
            arguments: {
              username: username,
              count: tweetCount,
              includeReplies: includeReplies,
              includeRetweets: includeRetweets,
            },
          },
        };

        if (process.env.DEBUG === "true") {
          console.log(
            "DEBUG: Request payload:",
            JSON.stringify(request, null, 2)
          );
        }

        // Register a response handler
        const searchPromise = new Promise((resolve, reject) => {
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

            // If we get here, the search was successful
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
                    if (
                      tweetData &&
                      tweetData.tweets &&
                      Array.isArray(tweetData.tweets)
                    ) {
                      resolve(tweetData.tweets);
                      return;
                    }
                  } catch (parseError) {
                    console.log(
                      "Warning: Failed to parse tweet data:",
                      parseError.message
                    );
                  }
                }
              } catch (error) {
                console.log(
                  "Warning: Exception while processing response:",
                  error.message
                );
              }

              reject(new Error("Failed to extract tweets from response"));
            } else {
              reject(new Error("Invalid response from MCP server"));
            }
          });

          // Send the request
          client.sendRequest(request);
        });

        const tweets = await searchPromise;

        if (tweets.length === 0) {
          console.log("\nNo tweets found for this user.");
        } else {
          console.log(
            `\n✅ Found ${tweets.length} tweets from @${username}:\n`
          );

          tweets.forEach((tweet, index) => {
            console.log(`[${index + 1}] Tweet ID: ${tweet.id}`);
            console.log(
              `    Date: ${new Date(tweet.createdAt).toLocaleString()}`
            );
            console.log(
              `    Text: ${tweet.text.substring(0, 100)}${
                tweet.text.length > 100 ? "..." : ""
              }`
            );
            console.log(
              `    Likes: ${tweet.likeCount}, Retweets: ${tweet.retweetCount}, Replies: ${tweet.replyCount}`
            );
            console.log("");
          });

          // Ask if user wants to save a tweet ID for replying later
          if (
            readlineSync.keyInYNStrict(
              "\nDo you want to save a tweet ID for replying later?"
            )
          ) {
            const tweetIndex =
              parseInt(
                readlineSync.question("Enter the number of the tweet to save: ")
              ) - 1;

            if (tweetIndex >= 0 && tweetIndex < tweets.length) {
              const tweetId = tweets[tweetIndex].id;
              fs.writeFileSync("./last-tweet-id.txt", tweetId);
              console.log(`Tweet ID ${tweetId} saved for future replies.`);
            } else {
              console.log("Invalid tweet number. No tweet ID saved.");
            }
          }
        }
      } catch (error) {
        console.error(`\n❌ ERROR: Failed to search tweets: ${error.message}`);

        if (error.details) {
          console.error(
            "Error details:",
            JSON.stringify(error.details, null, 2)
          );
        }
      }
    } else if (searchType === "2") {
      // Search by keyword
      const query = readlineSync.question("\nEnter search query: ");
      if (!query.trim()) {
        console.log("No search query provided. Exiting...");
        await client.stop();
        return;
      }

      const count = readlineSync.question(
        "Number of tweets to retrieve (default: 10): "
      );
      const tweetCount = parseInt(count) || 10;

      console.log(
        `\nSearching for ${tweetCount} tweets matching "${query}"...`
      );

      try {
        // Create a direct JSON-RPC request
        const requestId = Math.floor(Math.random() * 10000);

        const request = {
          jsonrpc: "2.0",
          id: requestId.toString(),
          method: "tools/call",
          params: {
            name: "search_tweets",
            arguments: {
              query: query,
              count: tweetCount,
            },
          },
        };

        if (process.env.DEBUG === "true") {
          console.log(
            "DEBUG: Request payload:",
            JSON.stringify(request, null, 2)
          );
        }

        // Register a response handler
        const searchPromise = new Promise((resolve, reject) => {
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

            // If we get here, the search was successful
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
                    if (
                      tweetData &&
                      tweetData.tweets &&
                      Array.isArray(tweetData.tweets)
                    ) {
                      resolve(tweetData.tweets);
                      return;
                    }
                  } catch (parseError) {
                    console.log(
                      "Warning: Failed to parse tweet data:",
                      parseError.message
                    );
                  }
                }
              } catch (error) {
                console.log(
                  "Warning: Exception while processing response:",
                  error.message
                );
              }

              reject(new Error("Failed to extract tweets from response"));
            } else {
              reject(new Error("Invalid response from MCP server"));
            }
          });

          // Send the request
          client.sendRequest(request);
        });

        const tweets = await searchPromise;

        if (tweets.length === 0) {
          console.log("\nNo tweets found matching your search query.");
        } else {
          console.log(
            `\n✅ Found ${tweets.length} tweets matching "${query}":\n`
          );

          tweets.forEach((tweet, index) => {
            console.log(`[${index + 1}] Tweet ID: ${tweet.id}`);
            console.log(
              `    Author: ${tweet.author.name} (@${tweet.author.username})`
            );
            console.log(
              `    Date: ${new Date(tweet.createdAt).toLocaleString()}`
            );
            console.log(
              `    Text: ${tweet.text.substring(0, 100)}${
                tweet.text.length > 100 ? "..." : ""
              }`
            );
            console.log(
              `    Likes: ${tweet.likeCount}, Retweets: ${tweet.retweetCount}, Replies: ${tweet.replyCount}`
            );
            console.log("");
          });

          // Ask if user wants to save a tweet ID for replying later
          if (
            readlineSync.keyInYNStrict(
              "\nDo you want to save a tweet ID for replying later?"
            )
          ) {
            const tweetIndex =
              parseInt(
                readlineSync.question("Enter the number of the tweet to save: ")
              ) - 1;

            if (tweetIndex >= 0 && tweetIndex < tweets.length) {
              const tweetId = tweets[tweetIndex].id;
              fs.writeFileSync("./last-tweet-id.txt", tweetId);
              console.log(`Tweet ID ${tweetId} saved for future replies.`);
            } else {
              console.log("Invalid tweet number. No tweet ID saved.");
            }
          }
        }
      } catch (error) {
        console.error(`\n❌ ERROR: Failed to search tweets: ${error.message}`);

        if (error.details) {
          console.error(
            "Error details:",
            JSON.stringify(error.details, null, 2)
          );
        }
      }
    } else {
      console.log("Invalid selection. Exiting...");
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
