import { TwitterClient } from "../build/twitter-client.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function main() {
  try {
    console.log("=== Twitter API Test ===");

    // Create a TwitterClient instance
    const client = new TwitterClient();

    // Get the authentication configuration
    const authMethod = process.env.AUTH_METHOD || "cookies";
    console.log("Using authentication method:", authMethod);

    let authConfig = { method: authMethod };

    if (authMethod === "cookies") {
      if (!process.env.TWITTER_COOKIES) {
        console.error(
          "Error: TWITTER_COOKIES environment variable is required for cookie authentication."
        );
        process.exit(1);
      }

      try {
        const cookies = JSON.parse(process.env.TWITTER_COOKIES);
        // The authentication.js file expects cookies to be in config.data.cookies
        authConfig.data = { cookies };
        console.log("Parsed cookies successfully.");
      } catch (error) {
        console.error("Error parsing TWITTER_COOKIES:", error.message);
        process.exit(1);
      }
    } else if (authMethod === "credentials") {
      if (!process.env.TWITTER_USERNAME || !process.env.TWITTER_PASSWORD) {
        console.error(
          "Error: TWITTER_USERNAME and TWITTER_PASSWORD environment variables are required for credentials authentication."
        );
        process.exit(1);
      }

      authConfig.username = process.env.TWITTER_USERNAME;
      authConfig.password = process.env.TWITTER_PASSWORD;

      if (process.env.TWITTER_EMAIL) {
        authConfig.email = process.env.TWITTER_EMAIL;
      }

      if (process.env.TWITTER_2FA_SECRET) {
        authConfig.twoFactorSecret = process.env.TWITTER_2FA_SECRET;
      }
    } else if (authMethod === "api") {
      if (
        !process.env.TWITTER_API_KEY ||
        !process.env.TWITTER_API_SECRET_KEY ||
        !process.env.TWITTER_ACCESS_TOKEN ||
        !process.env.TWITTER_ACCESS_TOKEN_SECRET
      ) {
        console.error(
          "Error: TWITTER_API_KEY, TWITTER_API_SECRET_KEY, TWITTER_ACCESS_TOKEN, and TWITTER_ACCESS_TOKEN_SECRET environment variables are required for API authentication."
        );
        process.exit(1);
      }

      authConfig.apiKey = process.env.TWITTER_API_KEY;
      authConfig.apiSecretKey = process.env.TWITTER_API_SECRET_KEY;
      authConfig.accessToken = process.env.TWITTER_ACCESS_TOKEN;
      authConfig.accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;
    } else {
      console.error(`Error: Unsupported authentication method: ${authMethod}`);
      process.exit(1);
    }

    // Send a test tweet
    const tweetText =
      "Test tweet from Twitter API test script - " + new Date().toISOString();
    console.log("Sending tweet:", tweetText);

    try {
      // Add a custom implementation of sendTweet that logs more details
      // Save original method for reference or future use
      console.log("Original sendTweet method saved, implementing custom version");
      client.sendTweet = async function (config, text, replyToTweetId, media) {
        console.log("DEBUG: TwitterClient.sendTweet called with:", {
          config: typeof config,
          configMethod: config.method,
          text,
          replyToTweetId,
          hasMedia: !!media,
        });

        try {
          console.log(
            "DEBUG: Getting scraper with config:",
            JSON.stringify(config, null, 2)
          );
          const scraper = await this.authManager.getScraper(config);
          console.log("DEBUG: Got scraper");

          const processedMedia = media?.map((item) => ({
            data: Buffer.from(item.data, "base64"),
            mediaType: item.mediaType,
          }));

          console.log("DEBUG: Sending tweet to Twitter API...");
          const response = await scraper.sendTweet(
            text,
            replyToTweetId,
            processedMedia
          );
          console.log("DEBUG: Got response from Twitter API");

          const responseText = await response.text();
          console.log("DEBUG: Raw Twitter API response text:", responseText);

          const responseData = JSON.parse(responseText);
          console.log(
            "DEBUG: Parsed Twitter API response data:",
            JSON.stringify(responseData, null, 2)
          );

          const tweetId =
            responseData?.data?.create_tweet?.tweet_results?.result?.rest_id;
          console.log("DEBUG: Extracted tweet ID:", tweetId);

          console.log(
            "DEBUG: Response data structure:",
            JSON.stringify(
              {
                hasResponseData: !!responseData,
                hasData: responseData && !!responseData.data,
                hasCreateTweet:
                  responseData?.data && !!responseData.data.create_tweet,
                hasTweetResults:
                  responseData?.data?.create_tweet &&
                  !!responseData.data.create_tweet.tweet_results,
                hasResult:
                  responseData?.data?.create_tweet?.tweet_results &&
                  !!responseData.data.create_tweet.tweet_results.result,
                hasRestId:
                  responseData?.data?.create_tweet?.tweet_results?.result &&
                  !!responseData.data.create_tweet.tweet_results.result.rest_id,
              },
              null,
              2
            )
          );

          if (!tweetId) {
            console.log(
              "DEBUG: Failed to extract tweet ID from response. Full response data:",
              JSON.stringify(responseData, null, 2)
            );
            throw new Error("Failed to extract tweet ID from response");
          }

          return await this.getTweetById(config, tweetId);
        } catch (error) {
          console.log(
            "DEBUG: Error in TwitterClient.sendTweet:",
            error.message
          );
          console.log("DEBUG: Error stack:", error.stack);
          throw error;
        }
      };

      const result = await client.sendTweet(authConfig, tweetText);
      console.log("Tweet sent successfully!");
      console.log("Tweet ID:", result.id);
      console.log("Tweet URL:", `https://twitter.com/user/status/${result.id}`);
    } catch (error) {
      console.error("Error sending tweet:", error.message);
      if (error.stack) {
        console.error("Error stack:", error.stack);
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
    if (error.stack) {
      console.error("Error stack:", error.stack);
    }
    process.exit(1);
  }
}

main();
