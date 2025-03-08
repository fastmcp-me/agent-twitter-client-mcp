import readlineSync from "readline-sync";
import { spawn } from "child_process";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

function runScript(scriptPath, env = {}) {
  return new Promise((resolve, reject) => {
    const childProcess = spawn("node", [scriptPath], {
      stdio: "inherit",
      env: { ...process.env, ...env },
    });

    childProcess.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script exited with code ${code}`));
      }
    });
  });
}

async function main() {
  console.log("=================================================");
  console.log("  agent-twitter-client-mcp Demo");
  console.log("=================================================");
  console.log(
    "\nThis demo shows how to use agent-twitter-client-mcp to interact with Twitter.\n"
  );

  const options = [
    "Search for tweets from a user",
    "Send a single tweet",
    "Send a tweet thread",
    "Run simple tweet demo",
    "Connect to existing MCP server",
    "Configure settings",
    "Exit",
  ];

  let running = true;
  while (running) {
    const index = readlineSync.keyInSelect(
      options,
      "What would you like to do?"
    );

    try {
      switch (index) {
        case 0: {
          // Search for tweets
          await runScript("./tweet-search.js");
          break;
        }
        case 1: {
          // Send a single tweet
          await runScript("./send-tweet.js");
          break;
        }
        case 2: {
          // Send a tweet thread
          await runScript("./tweet-thread.js");
          break;
        }
        case 3: {
          // Run simple tweet demo
          await runScript("./simple-tweet.js");
          break;
        }
        case 4: {
          // Connect to existing MCP server
          console.log("\nConnecting to an existing MCP server...");
          console.log(
            "Make sure you have started the MCP server in another terminal with:"
          );
          console.log("PORT=3001 npx agent-twitter-client-mcp\n");

          const serverPort = readlineSync.question(
            "Enter the port (default: 3001): ",
            {
              defaultInput: "3001",
            }
          );

          await runScript("./test-client.js", {
            PORT: serverPort,
            START_SERVER: "false",
          });
          break;
        }
        case 5: {
          // Configure settings
          console.log("\nConfigure settings:");
          const debug = readlineSync.keyInYNStrict("Enable debug mode?");
          const startServer = readlineSync.keyInYNStrict(
            "Start MCP server automatically?"
          );
          const customPort = readlineSync.keyInYNStrict("Use custom port?");

          let configPort = "3001";
          if (customPort) {
            configPort = readlineSync.question(
              "Enter the port (default: 3001): ",
              {
                defaultInput: "3001",
              }
            );
          }

          console.log("\nSettings configured:");
          console.log(`- Debug mode: ${debug ? "Enabled" : "Disabled"}`);
          console.log(`- Start server: ${startServer ? "Yes" : "No"}`);
          console.log(`- Port: ${configPort}`);

          // Ask which script to run with these settings
          console.log(
            "\nWhich script would you like to run with these settings?"
          );
          const scriptOptions = [
            "Search for tweets from a user",
            "Send a single tweet",
            "Send a tweet thread",
            "Run simple tweet demo",
            "None (return to main menu)",
          ];

          const scriptIndex = readlineSync.keyInSelect(
            scriptOptions,
            "Select a script:"
          );

          if (scriptIndex >= 0 && scriptIndex < 4) {
            const scriptPaths = [
              "./tweet-search.js",
              "./send-tweet.js",
              "./tweet-thread.js",
              "./simple-tweet.js",
            ];
            await runScript(scriptPaths[scriptIndex], {
              DEBUG: debug.toString(),
              START_SERVER: startServer.toString(),
              PORT: configPort,
            });
          }
          break;
        }
        default:
          console.log("Exiting...");
          running = false;
          return;
      }
    } catch (error) {
      console.error("Error:", error);
    }

    console.log("\n");
  }
}

main();
