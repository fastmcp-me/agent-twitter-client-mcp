import readlineSync from "readline-sync";
import { spawn } from "child_process";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Simple menu for the Twitter MCP demo
 */
async function main() {
  console.log("\n=== Twitter MCP Demo Menu ===\n");

  const options = [
    { name: "Send a Tweet (Fixed Version)", script: "fixed-tweet.js" },
    { name: "Send a Tweet (Robust Version)", script: "robust-tweet.js" },
    { name: "Send a Tweet (Original Version)", script: "simple-tweet.js" },
    { name: "Search Tweets", script: "simple-search.js" },
    { name: "Create a Thread", script: "simple-thread.js" },
    { name: "Exit", script: null },
  ];

  options.forEach((option, index) => {
    console.log(`[${index + 1}] ${option.name}`);
  });

  const selection = readlineSync.question("\nSelect an option: ");
  const optionIndex = parseInt(selection) - 1;

  if (isNaN(optionIndex) || optionIndex < 0 || optionIndex >= options.length) {
    console.log("Invalid selection. Exiting...");
    return;
  }

  const selectedOption = options[optionIndex];

  if (!selectedOption.script) {
    console.log("Exiting...");
    return;
  }

  console.log(`\nRunning ${selectedOption.name}...\n`);

  // Set up environment variables
  const env = { ...process.env };

  // Ask if debug mode should be enabled
  if (readlineSync.keyInYNStrict("Enable debug mode?")) {
    env.DEBUG = "true";
    console.log("Debug mode enabled.");
  } else {
    env.DEBUG = "false";
    console.log("Debug mode disabled.");
  }

  // Run the selected script
  const scriptProcess = spawn("node", [selectedOption.script], {
    stdio: "inherit",
    env,
  });

  // Handle process exit
  scriptProcess.on("exit", (code) => {
    console.log(`\n${selectedOption.name} completed with exit code ${code}.`);
    console.log("\nPress Enter to return to the menu...");
    readlineSync.question("");

    // Restart the menu
    main();
  });

  // Handle errors
  scriptProcess.on("error", (error) => {
    console.error(`Error running ${selectedOption.name}:`, error.message);
    console.log("\nPress Enter to return to the menu...");
    readlineSync.question("");

    // Restart the menu
    main();
  });
}

// Start the menu
main();
