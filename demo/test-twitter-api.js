import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * This script directly tests the Twitter API to see what's happening with the response.
 * It will help us understand why we're getting the "Failed to extract tweet ID from response" error.
 */
async function main() {
  try {
    console.log("=== Twitter API Test ===");

    // Find the twitter-client.js file
    const packagePath = path.resolve("./build/twitter-client.js");

    if (!fs.existsSync(packagePath)) {
      console.error(`Error: Could not find ${packagePath}`);
      console.error(
        "Make sure the build directory exists and contains the twitter-client.js file."
      );
      process.exit(1);
    }

    console.log(`Found package file at: ${packagePath}`);

    // Read the file
    let fileContent = fs.readFileSync(packagePath, "utf8");
    console.log("Read file content successfully.");

    // Find the tweet ID extraction line
    const tweetIdRegex =
      /const\s+tweetId\s*=\s*responseData\?\.\s*data\?\.\s*create_tweet\?\.\s*tweet_results\?\.\s*result\?\.\s*rest_id\s*;/;
    const tweetIdMatch = fileContent.match(tweetIdRegex);

    if (!tweetIdMatch) {
      console.error(
        "Error: Could not find the tweet ID extraction in the file."
      );
      process.exit(1);
    }

    console.log("Found tweet ID extraction line:", tweetIdMatch[0]);
    console.log("\nThis suggests the expected response structure is:");
    console.log("responseData.data.create_tweet.tweet_results.result.rest_id");

    // Create a test file that will help us debug the issue
    const testFilePath = path.resolve("./demo/twitter-api-test.js");

    const testFileContent = `
import { TwitterClient } from '../build/twitter-client.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  try {
    console.log("=== Twitter API Test ===");
    
    // Create a TwitterClient instance
    const client = new TwitterClient();
    
    // Get the authentication configuration
    const authConfig = {
      method: process.env.AUTH_METHOD || 'cookies',
      cookies: process.env.TWITTER_COOKIES ? JSON.parse(process.env.TWITTER_COOKIES) : undefined,
      username: process.env.TWITTER_USERNAME,
      password: process.env.TWITTER_PASSWORD,
      email: process.env.TWITTER_EMAIL,
      twoFactorSecret: process.env.TWITTER_2FA_SECRET,
      apiKey: process.env.TWITTER_API_KEY,
      apiSecretKey: process.env.TWITTER_API_SECRET_KEY,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    };
    
    console.log("Using authentication method:", authConfig.method);
    
    // Send a test tweet
    const tweetText = "Test tweet from Twitter API test script - " + new Date().toISOString();
    console.log("Sending tweet:", tweetText);
    
    try {
      // Add a custom implementation of sendTweet that logs more details
      const originalSendTweet = client.sendTweet;
      client.sendTweet = async function(config, text, replyToTweetId, media) {
        console.log("DEBUG: TwitterClient.sendTweet called with:", {
          config: typeof config,
          text,
          replyToTweetId,
          hasMedia: !!media
        });
        
        try {
          const scraper = await this.authManager.getScraper(config);
          console.log("DEBUG: Got scraper");
          
          const processedMedia = media?.map(item => ({
            data: Buffer.from(item.data, 'base64'),
            mediaType: item.mediaType
          }));
          
          console.log("DEBUG: Sending tweet to Twitter API...");
          const response = await scraper.sendTweet(text, replyToTweetId, processedMedia);
          console.log("DEBUG: Got response from Twitter API");
          
          const responseText = await response.text();
          console.log("DEBUG: Raw Twitter API response text:", responseText);
          
          const responseData = JSON.parse(responseText);
          console.log("DEBUG: Parsed Twitter API response data:", JSON.stringify(responseData, null, 2));
          
          const tweetId = responseData?.data?.create_tweet?.tweet_results?.result?.rest_id;
          console.log("DEBUG: Extracted tweet ID:", tweetId);
          
          console.log("DEBUG: Response data structure:", JSON.stringify({
            hasResponseData: !!responseData,
            hasData: responseData && !!responseData.data,
            hasCreateTweet: responseData?.data && !!responseData.data.create_tweet,
            hasTweetResults: responseData?.data?.create_tweet && !!responseData.data.create_tweet.tweet_results,
            hasResult: responseData?.data?.create_tweet?.tweet_results && !!responseData.data.create_tweet.tweet_results.result,
            hasRestId: responseData?.data?.create_tweet?.tweet_results?.result && !!responseData.data.create_tweet.tweet_results.result.rest_id
          }, null, 2));
          
          if (!tweetId) {
            console.log("DEBUG: Failed to extract tweet ID from response. Full response data:", JSON.stringify(responseData, null, 2));
            throw new Error('Failed to extract tweet ID from response');
          }
          
          return await this.getTweetById(config, tweetId);
        } catch (error) {
          console.log("DEBUG: Error in TwitterClient.sendTweet:", error.message);
          console.log("DEBUG: Error stack:", error.stack);
          throw error;
        }
      };
      
      const result = await client.sendTweet(authConfig, tweetText);
      console.log("Tweet sent successfully!");
      console.log("Tweet ID:", result.id);
      console.log("Tweet URL:", \`https://twitter.com/user/status/\${result.id}\`);
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
`;

    fs.writeFileSync(testFilePath, testFileContent);
    console.log(`\nCreated test file at: ${testFilePath}`);

    console.log("\nTo run the test, use:");
    console.log("node demo/twitter-api-test.js");

    console.log(
      '\nThis will help us understand why we\'re getting the "Failed to extract tweet ID from response" error.'
    );
  } catch (error) {
    console.error("Error:", error.message);
    if (error.stack) {
      console.error("Error stack:", error.stack);
    }
    process.exit(1);
  }
}

main();
