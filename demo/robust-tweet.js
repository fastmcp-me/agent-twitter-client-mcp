import readlineSync from "readline-sync";
import { spawn } from "child_process";
import { createInterface } from "readline";
import { singleTweets } from "./tweets.js";
import fs from "fs";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * A more robust client for sending tweets via the Twitter MCP
 * This version avoids the EPIPE error by using a fresh process for each request
 */
async function main() {
  console.log("=== Robust Twitter MCP Tweet Sender ===\n");

  // Display available tweets
  console.log("Available tweets:");

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
      return;
    }

    // Check character count
    if (selectedTweet.length > 280) {
      console.log(
        `Tweet is too long (${selectedTweet.length} characters). Maximum is 280 characters.`
      );
      console.log("Please try again with a shorter tweet.");
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
    replyToTweetId = readlineSync.question("Enter the tweet ID to reply to: ");
    if (!replyToTweetId.trim()) {
      console.log("No tweet ID provided. Sending as a regular tweet...");
      replyToTweetId = null;
    }
  }

  // Create the JSON-RPC request
  const request = {
    jsonrpc: "2.0",
    id: "1",
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
    console.log(`This tweet will be a reply to tweet ID: ${replyToTweetId}`);
  }

  // Convert the request to a string
  const requestString = JSON.stringify(request);

  console.log("Sending tweet to Twitter...");

  try {
    // Use a direct approach with a fresh MCP process
    const result = await sendTweetDirectly(requestString);

    if (result.success) {
      console.log("\n✅ Tweet sent successfully!");

      if (result.tweetId) {
        console.log("Tweet ID:", result.tweetId);
        console.log(
          "Tweet URL:",
          `https://twitter.com/user/status/${result.tweetId}`
        );

        // Save the tweet ID for future replies
        fs.writeFileSync("./last-tweet-id.txt", result.tweetId);
        console.log("Tweet ID saved for future replies.");
      } else {
        console.log("Note: Tweet ID not returned in the response.");
        console.log(
          "The tweet was likely sent successfully, but we couldn't extract the ID."
        );
        console.log("Please check your Twitter account to confirm.");
      }
    } else {
      console.error("\n❌ ERROR: Failed to send tweet:", result.error);

      // Check for character limit error
      if (result.error.includes("cannot exceed 280 characters")) {
        console.log("\nThe tweet exceeds Twitter's 280 character limit.");
        console.log("Current length:", selectedTweet.length, "characters");
        console.log("Please edit your tweet to be shorter.");
      }

      // Check for authentication errors
      if (
        result.error.includes("authentication") ||
        result.error.includes("auth") ||
        result.error.includes("login") ||
        result.error.includes("credentials")
      ) {
        console.log("\nThere seems to be an authentication issue.");
        console.log("Please check your Twitter credentials in the .env file.");
        console.log("You may need to refresh your cookies or re-authenticate.");
      }

      // Check for rate limiting
      if (
        result.error.includes("rate limit") ||
        result.error.includes("too many requests")
      ) {
        console.log("\nYou've hit Twitter's rate limits.");
        console.log("Please wait a while before trying again.");
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

/**
 * Send a tweet directly using a fresh MCP process
 * This avoids the EPIPE error by using a new process for each request
 *
 * @param {string} requestString - The JSON-RPC request as a string
 * @returns {Promise<Object>} - The result of the tweet operation
 */
async function sendTweetDirectly(requestString) {
  return new Promise((resolve, reject) => {
    const debug = process.env.DEBUG === "true";
    const port = process.env.PORT || "3010";

    // Create a custom environment with our port settings
    const env = { ...process.env };
    env.DISABLE_HTTP_SERVER = "true";
    env.PORT = port;

    // Add a special environment variable to fix the authentication structure
    env.FIX_AUTH_STRUCTURE = "true";

    // Add verbose debugging if debug mode is enabled
    if (debug) {
      env.VERBOSE_DEBUG = "true";
    }

    if (debug) {
      console.log("DEBUG: Environment variables for MCP process:", {
        DISABLE_HTTP_SERVER: env.DISABLE_HTTP_SERVER,
        PORT: env.PORT,
        VERBOSE_DEBUG: env.VERBOSE_DEBUG,
        FIX_AUTH_STRUCTURE: env.FIX_AUTH_STRUCTURE,
      });
    }

    // Start the MCP server process
    if (debug) {
      console.log("DEBUG: Spawning MCP process");
    }

    const mcpProcess = spawn("npx", ["agent-twitter-client-mcp"], {
      env: env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    if (debug) {
      console.log(`DEBUG: MCP process spawned with PID ${mcpProcess.pid}`);
    }

    // Set a timeout to kill the process if it takes too long
    const timeoutId = setTimeout(() => {
      console.log("Operation timed out. Killing MCP process...");
      try {
        mcpProcess.kill("SIGTERM");
      } catch (error) {
        console.error("Error killing process:", error.message);
      }
      reject(new Error("Operation timed out"));
    }, 30000); // 30 second timeout

    // Handle process exit
    mcpProcess.on("exit", (code, signal) => {
      if (debug) {
        console.log(
          `DEBUG: MCP process exited with code ${code} and signal ${signal}`
        );
      }

      clearTimeout(timeoutId);

      // If the process exited before we got a response, consider it an error
      if (!processFinished) {
        reject(new Error(`MCP process exited unexpectedly with code ${code}`));
      }
    });

    // Handle process errors
    mcpProcess.on("error", (error) => {
      console.error("ERROR: MCP process error:", error);
      clearTimeout(timeoutId);
      reject(error);
    });

    // Handle stderr output
    mcpProcess.stderr.on("data", (data) => {
      const stderr = data.toString();
      // Always log stderr for debugging this issue
      console.error("MCP Error:", stderr);
    });

    // Create readline interface for reading MCP responses
    const rl = createInterface({
      input: mcpProcess.stdout,
      crlfDelay: Infinity,
    });

    if (debug) {
      console.log("DEBUG: Readline interface created");
    }

    let serverReady = false;
    let processFinished = false;
    let responseReceived = false;

    // Handle MCP responses
    rl.on("line", (line) => {
      // Log the raw line for debugging
      if (debug) {
        console.log("Raw MCP output:", line);
      }

      // Add special handling for lines that might contain Twitter API response data
      if (
        line.includes("twitter") ||
        line.includes("tweet") ||
        line.includes("response")
      ) {
        console.log("POTENTIAL TWITTER API DATA:", line);
      }

      try {
        // Check if this is a log message (starts with timestamp)
        if (line.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
          // This is a log message, not a JSON response
          if (debug) {
            console.log("Log message:", line);
          }

          // Check if this indicates the server is ready
          if (
            line.includes("Twitter MCP server running") ||
            line.includes("Initial health check completed")
          ) {
            serverReady = true;

            // Send the request once the server is ready
            if (serverReady && !responseReceived) {
              if (debug) {
                console.log(
                  "DEBUG: Server ready, sending request:",
                  requestString
                );
              }

              try {
                mcpProcess.stdin.write(requestString + "\n");
              } catch (error) {
                console.error("ERROR: Failed to write to MCP process:", error);
                clearTimeout(timeoutId);
                processFinished = true;
                reject(error);
              }
            }
          }
          return;
        }

        // Try to parse the line as JSON
        const response = JSON.parse(line);

        if (debug) {
          console.log("Received response:", JSON.stringify(response, null, 2));

          // Add more detailed logging for the response structure
          if (response.result && response.result.content) {
            console.log(
              "RESPONSE CONTENT STRUCTURE:",
              JSON.stringify(
                {
                  contentLength: response.result.content.length,
                  contentTypes: response.result.content.map(
                    (item) => item.type
                  ),
                  isError: response.result.content.map((item) => item.isError),
                  textSnippets: response.result.content.map((item) =>
                    item.text
                      ? item.text.length > 100
                        ? item.text.substring(0, 100) + "..."
                        : item.text
                      : "No text"
                  ),
                },
                null,
                2
              )
            );
          }
        }

        // Check if this is a JSON-RPC 2.0 response
        if (response.jsonrpc === "2.0" && response.id === "1") {
          responseReceived = true;
          processFinished = true;

          // Process the response
          if (response.error) {
            resolve({
              success: false,
              error: response.error.message || "Unknown error",
            });
          } else if (
            response.result &&
            response.result.content &&
            response.result.content.length > 0
          ) {
            try {
              // Try to parse the tweet data from the response
              const contentText = response.result.content[0].text;

              // Log the raw content text for debugging
              if (debug) {
                console.log("RAW CONTENT TEXT:", contentText);

                // Try to identify any potential tweet IDs in the text
                const potentialIds = contentText.match(/\d{10,20}/g);
                if (potentialIds && potentialIds.length > 0) {
                  console.log("POTENTIAL TWEET IDs FOUND:", potentialIds);
                }
              }

              if (contentText) {
                if (response.result.content[0].isError) {
                  resolve({
                    success: false,
                    error: contentText,
                  });
                  return;
                }

                try {
                  const tweetData = JSON.parse(contentText);
                  if (tweetData && tweetData.tweet && tweetData.tweet.id) {
                    resolve({
                      success: true,
                      tweetId: tweetData.tweet.id,
                      tweetData: tweetData.tweet,
                    });
                    return;
                  } else if (tweetData && tweetData.success) {
                    resolve({
                      success: true,
                      message: "Tweet sent successfully",
                    });
                    return;
                  }
                } catch (parseError) {
                  if (debug) {
                    console.log(
                      "Warning: Failed to parse tweet data:",
                      parseError.message
                    );
                  }

                  // Try to extract tweet ID using regex if JSON parsing fails
                  const idMatch =
                    contentText.match(/tweet ID: (\d+)/i) ||
                    contentText.match(/id['"]?\s*:\s*['"]?(\d+)/i);
                  if (idMatch && idMatch[1]) {
                    resolve({
                      success: true,
                      tweetId: idMatch[1],
                    });
                    return;
                  }
                }
              }

              // If we couldn't extract specific data but the response was successful
              if (
                response.result.status === "success" ||
                (response.result.content &&
                  response.result.content[0].text &&
                  !response.result.content[0].isError)
              ) {
                resolve({
                  success: true,
                  message: "Tweet likely sent successfully",
                });
              } else {
                resolve({
                  success: false,
                  error: "Failed to extract tweet data from response",
                });
              }
            } catch (error) {
              resolve({
                success: false,
                error: `Error processing response: ${error.message}`,
              });
            }
          } else {
            resolve({
              success: false,
              error: "Invalid response from MCP server",
            });
          }

          // Clean up
          clearTimeout(timeoutId);
          rl.close();

          // Give the process a moment to finish any pending operations
          setTimeout(() => {
            try {
              if (mcpProcess.stdin && mcpProcess.stdin.writable) {
                mcpProcess.stdin.end();
              }
              mcpProcess.kill("SIGTERM");
            } catch (error) {
              if (debug) {
                console.error("Error during cleanup:", error);
              }
            }
          }, 500);
        }
      } catch (error) {
        // Don't let parsing errors crash the application
        if (debug) {
          console.error("Error parsing MCP response:", error);
          console.error("Problematic line:", line);
        }
      }
    });
  });
}

// Run the main function
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
