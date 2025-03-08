import { McpClient } from "./mcp-client.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function main() {
  try {
    console.log("Starting simple tweet demo...");

    // Create a new McpClient instance with debug enabled
    const client = new McpClient({
      port: process.env.PORT ? parseInt(process.env.PORT) : 3001,
      debug: true,
      maxPortAttempts: 5,
      portIncrement: 1,
      startServer: true, // Start a new server
    });

    // Start the client
    console.log("Starting MCP client...");
    await client.start();
    console.log("MCP client started successfully");

    // List available tools
    console.log("Listing available tools...");
    const tools = await client.listTools();
    console.log(
      "Available tools:",
      tools && tools.tools
        ? tools.tools.map((tool) => tool.name)
        : "No tools found"
    );

    // Send a tweet using the correct format
    console.log("Sending a tweet with the correct format...");
    try {
      const result = await client.sendTweet(
        "Test tweet from simple-tweet.js using the correct format"
      );
      console.log("Tweet sent successfully:", result);
    } catch (error) {
      console.error("Error sending tweet:", error.message);
    }

    // Wait a bit before stopping
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Stop the client
    console.log("Stopping MCP client...");
    await client.stop();
    console.log("MCP client stopped");
  } catch (error) {
    console.error("Error in simple-tweet script:", error);
    process.exit(1);
  }
}

main();
