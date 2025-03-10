import { Scraper } from "agent-twitter-client";
import fs from "fs";
import dotenv from "dotenv";
import readline from "readline/promises";
import path from "path";

// Get the current directory
const currentDir = process.cwd();
console.log(`Current directory: ${currentDir}`);

// Load environment variables from demo/.env file
const envPath = path.join(currentDir, ".env");
console.log(`Loading environment from: ${envPath}`);
dotenv.config({ path: envPath });

// Debug environment variables (with sensitive info masked)
console.log("Environment variables loaded:");
console.log("AUTH_METHOD:", process.env.AUTH_METHOD || "not set");
console.log(
  "TWITTER_COOKIES:",
  process.env.TWITTER_COOKIES ? "[Set]" : "not set"
);
console.log(
  "TWITTER_USERNAME:",
  process.env.TWITTER_USERNAME ? "[Set]" : "not set"
);
console.log(
  "TWITTER_PASSWORD:",
  process.env.TWITTER_PASSWORD ? "[Set]" : "not set"
);
console.log("TWITTER_EMAIL:", process.env.TWITTER_EMAIL ? "[Set]" : "not set");

let scraper = null;

async function initializeScraper() {
  try {
    scraper = new Scraper();
    console.log("Scraper initialized successfully");

    // Check authentication method
    const authMethod = process.env.AUTH_METHOD || "cookies";

    // For Grok, we need to handle both cookie-based and credential-based auth
    let isLoggedIn = false;

    // Try cookie authentication first
    if (process.env.TWITTER_COOKIES) {
      console.log("Using cookies from environment variables...");

      // Debug the cookie format
      console.log("Cookie format check:");
      try {
        // Check if it's a JSON array
        if (
          process.env.TWITTER_COOKIES.startsWith("[") &&
          process.env.TWITTER_COOKIES.endsWith("]")
        ) {
          console.log("Cookies appear to be in JSON array format");
          const parsedCookies = JSON.parse(process.env.TWITTER_COOKIES);
          console.log(`Found ${parsedCookies.length} cookies in JSON array`);

          // Use the parsed cookies directly
          await scraper.setCookies(parsedCookies);
        } else {
          // Assume it's a semicolon-separated string
          console.log("Cookies appear to be in semicolon-separated format");
          const formattedCookies = process.env.TWITTER_COOKIES.split(";").map(
            (cookie) => cookie.trim()
          );
          console.log(`Found ${formattedCookies.length} cookies in string`);
          await scraper.setCookies(formattedCookies);
        }
      } catch (error) {
        console.error("Error parsing cookies:", error.message);
        console.log("Trying to use cookies as-is...");
        await scraper.setCookies([process.env.TWITTER_COOKIES]);
      }

      // Check if we're logged in with cookies
      isLoggedIn = await scraper.isLoggedIn();
      console.log("Cookie login check result:", isLoggedIn);
    } else {
      // Try to load cookies from a file
      try {
        console.log("Loading cookies from file...");
        const cookiesJson = JSON.parse(
          fs.readFileSync("./cookies.json", "utf-8")
        );
        console.log(`Found ${cookiesJson.length} cookies`);

        if (cookiesJson.length > 0) {
          // Format cookies as strings in the Set-Cookie header format
          const formattedCookies = cookiesJson.map((cookie) => {
            let cookieString = `${cookie.key}=${cookie.value}`;
            cookieString += `; Domain=${cookie.domain}`;
            cookieString += `; Path=${cookie.path}`;
            if (cookie.expires) cookieString += `; Expires=${cookie.expires}`;
            if (cookie.secure) cookieString += "; Secure";
            if (cookie.httpOnly) cookieString += "; HttpOnly";
            if (cookie.sameSite)
              cookieString += `; SameSite=${cookie.sameSite}`;
            return cookieString;
          });

          console.log("Setting cookies in scraper...");
          await scraper.setCookies(formattedCookies);

          // Check if we're logged in with cookies
          isLoggedIn = await scraper.isLoggedIn();
          console.log("Cookie login check result:", isLoggedIn);
        }
      } catch (error) {
        console.log(
          "No valid cookies found or error loading cookies:",
          error.message
        );
      }
    }

    // If cookie authentication failed, try credential-based authentication
    if (
      !isLoggedIn &&
      process.env.TWITTER_USERNAME &&
      process.env.TWITTER_PASSWORD
    ) {
      console.log(
        "Cookie authentication failed or not available. Trying username/password login..."
      );
      try {
        console.log(`Using username: ${process.env.TWITTER_USERNAME}`);

        // Debug the login parameters (without showing the actual password)
        console.log("Login parameters:");
        console.log("Username:", process.env.TWITTER_USERNAME);
        console.log(
          "Password:",
          process.env.TWITTER_PASSWORD ? "[Set]" : "[Not Set]"
        );
        console.log("Email:", process.env.TWITTER_EMAIL || "[Not Set]");

        await scraper.login(
          process.env.TWITTER_USERNAME,
          process.env.TWITTER_PASSWORD
        );
        isLoggedIn = await scraper.isLoggedIn();
        console.log("Credential login check result:", isLoggedIn);
      } catch (error) {
        console.error("Failed to login with credentials:", error);
      }
    }

    // Final check if we're logged in
    if (!isLoggedIn) {
      console.error(
        "Not logged in to Twitter. Please check your cookies or credentials."
      );
      console.log(
        "For Grok functionality, you need to provide valid Twitter credentials."
      );
      console.log(
        "Please set TWITTER_USERNAME and TWITTER_PASSWORD in your demo/.env file."
      );
      process.exit(1);
    }

    return scraper;
  } catch (error) {
    console.error("Failed to initialize Twitter scraper:", error);
    throw error;
  }
}

async function main() {
  try {
    await initializeScraper();

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log("\n=== Twitter Grok AI Chat ===");
    console.log('Type your messages to chat with Grok. Type "exit" to quit.\n');

    // Create a new conversation
    console.log("Creating a new Grok conversation...");
    const conversationId = await scraper.createGrokConversation();
    console.log(`Conversation created with ID: ${conversationId}\n`);

    // Store message history
    const messages = [];

    // Chat loop
    let chatActive = true;
    while (chatActive) {
      const userInput = await rl.question("You: ");

      // Exit condition
      if (userInput.toLowerCase() === "exit") {
        console.log("Exiting chat...");
        chatActive = false;
        break;
      }

      // Add user message to history
      messages.push({ role: "user", content: userInput });

      console.log("\nGrok is thinking...");

      try {
        // Send message to Grok
        const response = await scraper.grokChat({
          conversationId,
          messages,
        });

        // Check for rate limiting
        if (response.rateLimit?.isRateLimited) {
          console.log("\nRate Limited:", response.rateLimit.message);
          if (response.rateLimit.upsellInfo) {
            console.log("\nLimit Info:");
            console.log(
              `Usage Limit: ${response.rateLimit.upsellInfo.usageLimit}`
            );
            console.log(
              `Duration: ${response.rateLimit.upsellInfo.quotaDuration}`
            );
            console.log(`${response.rateLimit.upsellInfo.title}`);
            console.log(`${response.rateLimit.upsellInfo.message}`);
          }
          chatActive = false;
          break;
        }

        // Add Grok's response to message history
        messages.push({ role: "assistant", content: response.message });

        // Display Grok's response
        console.log("\nGrok:", response.message);
        console.log("\n" + "-".repeat(50) + "\n");
      } catch (error) {
        console.error("\nError sending message to Grok:", error);
        console.log("Trying to continue the conversation...");
      }
    }

    rl.close();
  } catch (error) {
    console.error("Failed to run Grok chat:", error);
  }
}

main();
