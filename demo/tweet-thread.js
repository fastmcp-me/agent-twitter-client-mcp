import { McpClient } from "./mcp-client.js";
import { threadTweets } from "./tweets.js";
import readlineSync from "readline-sync";

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

    console.log("\nPreparing to send tweet thread...");
    console.log(`Thread consists of ${threadTweets.length} tweets:`);
    threadTweets.forEach((tweet, index) => {
      console.log(`[${index + 1}] ${tweet}`);
    });

    // Confirm before sending
    const confirm = readlineSync.keyInYNStrict("\nSend this thread?");
    if (!confirm) {
      console.log("Cancelled. Exiting...");
      await client.stop();
      return;
    }

    // Send the thread
    let previousTweetId = null;
    let successCount = 0;

    for (let i = 0; i < threadTweets.length; i++) {
      console.log(`\nSending tweet ${i + 1}/${threadTweets.length}...`);

      try {
        const result = await client.sendTweet(threadTweets[i], previousTweetId);
        console.log("Tweet sent successfully!");

        if (result && result.id) {
          console.log("Tweet ID:", result.id);
          console.log(
            "Tweet URL:",
            `https://twitter.com/user/status/${result.id}`
          );

          // Store the tweet ID for the next reply
          previousTweetId = result.id;
          successCount++;
        } else {
          console.log("Warning: Tweet ID not returned in the response.");
          console.log("Thread may be broken at this point.");

          // Ask if user wants to continue without a proper reply chain
          if (i < threadTweets.length - 1) {
            const continueThread = readlineSync.keyInYNStrict(
              "Continue thread without proper reply chain?"
            );
            if (!continueThread) {
              console.log("Thread sending cancelled by user.");
              break;
            }
          }
        }
      } catch (error) {
        console.error(`Error sending tweet ${i + 1}:`, error.message);
        if (error.details) {
          console.error(
            "Error details:",
            JSON.stringify(error.details, null, 2)
          );
        }

        // Ask if user wants to retry or continue
        const action = readlineSync.question(
          "Enter 'r' to retry, 'c' to continue with next tweet, or any other key to abort: "
        );

        if (action.toLowerCase() === "r") {
          i--; // Retry the same tweet
          continue;
        } else if (action.toLowerCase() === "c") {
          console.log("Continuing with next tweet...");
          continue;
        } else {
          console.log("Thread sending aborted by user.");
          break;
        }
      }

      // Wait a bit between tweets to avoid rate limiting
      if (i < threadTweets.length - 1) {
        const waitTime = 3; // seconds
        console.log(`Waiting ${waitTime} seconds before sending next tweet...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));
      }
    }

    console.log(
      `\nThread sending complete. Successfully sent ${successCount}/${threadTweets.length} tweets.`
    );

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
