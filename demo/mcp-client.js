import { spawn } from "child_process";
import { createInterface } from "readline";
import dotenv from "dotenv";
import net from "net";

// Load environment variables
dotenv.config();

/**
 * McpClient - A client for interacting with the Twitter MCP server
 *
 * This class provides methods for:
 * - Starting a new MCP server or connecting to an existing one
 * - Sending requests to the MCP server
 * - Handling responses from the MCP server
 * - Managing the lifecycle of the MCP server
 */
export class McpClient {
  /**
   * Create a new McpClient instance
   *
   * @param {Object} options - Configuration options
   * @param {number} options.port - The port to use for the MCP server (default: 3001)
   * @param {boolean} options.debug - Whether to enable debug logging (default: false)
   * @param {number} options.maxPortAttempts - Maximum number of port attempts (default: 10)
   * @param {number} options.portIncrement - Increment port by this amount on conflict (default: 1)
   * @param {boolean} options.startServer - Whether to start a new server or connect to existing (default: true)
   */
  constructor(options = {}) {
    this.mcpProcess = null;
    this.rl = null;
    this.responseHandlers = new Map();
    this.nextRequestId = 1;
    this.options = {
      port: options.port || 3001,
      debug: options.debug || false,
      maxPortAttempts: options.maxPortAttempts || 10,
      portIncrement: options.portIncrement || 1,
      startServer: options.startServer !== false, // Start the server by default
    };
    this.isReady = false;
    this.isExiting = false;
    this.restartAttempts = 0;
    this.maxRestartAttempts = 3;
    this.currentPort = this.options.port;
    this.socket = null; // Socket for connecting to existing server
  }

  /**
   * Start the MCP server or connect to an existing one
   *
   * @returns {Promise<void>} A promise that resolves when the server is started or connected
   */
  async start() {
    if (this.options.startServer) {
      return this.startServer();
    } else {
      return this.connectToServer();
    }
  }

  /**
   * Connect to an existing MCP server
   *
   * @returns {Promise<void>} A promise that resolves when connected to the server
   */
  async connectToServer() {
    return new Promise((resolve, reject) => {
      try {
        console.log(`Connecting to MCP server on port ${this.currentPort}...`);

        // Create a socket connection to the server
        this.socket = new net.Socket();

        this.socket.on("connect", () => {
          console.log(`Connected to MCP server on port ${this.currentPort}`);
          this.isReady = true;

          // Create readline interface for reading responses
          this.rl = createInterface({
            input: this.socket,
            crlfDelay: Infinity,
          });

          // Handle responses
          this.rl.on("line", (line) => {
            // Log the raw line for debugging
            if (this.options.debug) {
              console.log("Raw MCP output:", line);
            }

            try {
              // Try to parse the line as JSON
              const response = JSON.parse(line);

              if (this.options.debug) {
                console.log(
                  "Received response:",
                  JSON.stringify(response, null, 2)
                );
              }

              // Check if this is a JSON-RPC 2.0 response
              if (response.jsonrpc === "2.0" && response.id) {
                // Find and call the appropriate response handler
                if (this.responseHandlers.has(response.id)) {
                  const handler = this.responseHandlers.get(response.id);
                  this.responseHandlers.delete(response.id);
                  handler(response);
                }
              }
            } catch (error) {
              // Don't let parsing errors crash the application
              if (this.options.debug) {
                console.error("Error parsing MCP response:", error);
                console.error("Problematic line:", line);
              }
            }
          });

          resolve();
        });

        this.socket.on("error", (error) => {
          console.error(`Error connecting to MCP server: ${error.message}`);
          reject(error);
        });

        // Connect to the server
        this.socket.connect(this.currentPort, "localhost");
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Start a new MCP server
   *
   * @returns {Promise<void>} A promise that resolves when the server is started
   */
  async startServer() {
    return new Promise((resolve, reject) => {
      try {
        console.log("Starting MCP server...");

        // Create a custom environment with our port settings
        const env = { ...process.env };

        // Set environment variables to disable HTTP server and configure port
        env.DISABLE_HTTP_SERVER = "true";
        env.PORT = this.currentPort.toString();

        if (this.options.debug) {
          console.log("DEBUG: Environment variables for MCP process:", {
            DISABLE_HTTP_SERVER: env.DISABLE_HTTP_SERVER,
            PORT: env.PORT,
          });
        }

        // Start the MCP server process
        if (this.options.debug) {
          console.log("DEBUG: Spawning MCP process");
        }

        this.mcpProcess = spawn("npx", ["agent-twitter-client-mcp"], {
          env: env,
          stdio: ["pipe", "pipe", "pipe"],
        });

        if (this.options.debug) {
          console.log(
            `DEBUG: MCP process spawned with PID ${this.mcpProcess.pid}`
          );
        }

        // Set up error handling for the process
        this.mcpProcess.on("error", (err) => {
          console.error("ERROR: MCP process error:", err);
          reject(err);
        });

        // Handle stderr output
        this.mcpProcess.stderr.on("data", (data) => {
          const stderr = data.toString();
          console.error("MCP Error:", stderr);

          // If this is a port conflict error, set the flag
          if (stderr.includes("EADDRINUSE")) {
            if (this.options.debug) {
              console.log("DEBUG: Port conflict detected in stderr");
            }
          }
        });

        // Create readline interface for reading MCP responses
        this.rl = createInterface({
          input: this.mcpProcess.stdout,
          crlfDelay: Infinity,
        });

        if (this.options.debug) {
          console.log("DEBUG: Readline interface created");
        }

        // Handle MCP responses
        this.rl.on("line", (line) => {
          // Log the raw line for debugging
          if (this.options.debug) {
            console.log("Raw MCP output:", line);
          }

          try {
            // Check if this is a log message (starts with timestamp)
            if (line.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
              // This is a log message, not a JSON response
              if (this.options.debug) {
                console.log("Log message:", line);
              }

              // Check if this indicates the server is ready
              if (
                line.includes("Twitter MCP server running") ||
                line.includes("Initial health check completed")
              ) {
                if (!this.isReady) {
                  this.isReady = true;
                  console.log("MCP client started successfully!");
                  resolve();
                }
              }
              return;
            }

            // Try to parse the line as JSON
            const response = JSON.parse(line);

            if (this.options.debug) {
              console.log(
                "Received response:",
                JSON.stringify(response, null, 2)
              );
            }

            // Check if this is a JSON-RPC 2.0 response
            if (response.jsonrpc === "2.0" && response.id) {
              // Find and call the appropriate response handler
              if (this.responseHandlers.has(response.id)) {
                const handler = this.responseHandlers.get(response.id);
                this.responseHandlers.delete(response.id);
                handler(response);
              }
            }
          } catch (error) {
            // Don't let parsing errors crash the application
            if (
              this.options.debug &&
              !line.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
            ) {
              console.error("Error parsing MCP response:", error);
              console.error("Problematic line:", line);
            }
          }
        });

        // Handle MCP errors
        this.mcpProcess.stderr.on("data", (data) => {
          const errorMsg = data.toString();
          console.error("MCP Error:", errorMsg);

          // Check for port conflict
          if (errorMsg.includes("EADDRINUSE")) {
            if (this.options.debug) {
              console.log(
                "DEBUG: Port conflict detected, but continuing with stdio interface"
              );
            }

            // If we haven't started yet, mark as started since we can still use stdio
            if (!this.isReady) {
              this.isReady = true;
              console.log(
                "MCP client started successfully (using stdio only)!"
              );
              resolve();
            }
          }
        });

        // Handle process exit
        this.mcpProcess.on("exit", (code, signal) => {
          if (this.options.debug) {
            console.log(
              `DEBUG: MCP process exited with code ${code} and signal ${signal}`
            );
          }

          // Check if the process exited due to a port conflict
          if (code === 1 && !this.isExiting) {
            // Check if we've tried too many ports
            if (
              this.currentPort - this.options.port >=
              this.options.maxPortAttempts * this.options.portIncrement
            ) {
              console.error(
                `ERROR: Tried ${this.options.maxPortAttempts} different ports without success. Giving up.`
              );
              reject(
                new Error(
                  `Failed to start MCP server after trying ${this.options.maxPortAttempts} different ports`
                )
              );
              return;
            }

            // Try the next port
            this.currentPort += this.options.portIncrement;
            if (this.options.debug) {
              console.log(
                `DEBUG: Port conflict detected. Trying port ${this.currentPort}`
              );
            }

            // Restart the process with the new port
            this.restartMcpProcess();
            return;
          }

          if (code !== 0 && !this.isExiting) {
            console.error(`ERROR: MCP process exited with code ${code}`);
            reject(new Error(`MCP process exited with code ${code}`));
          }
        });

        // Wait for the MCP server to start
        setTimeout(() => {
          if (!this.isReady) {
            this.isReady = true;
            console.log("MCP client started successfully (timeout)!");
            resolve();
          }
        }, 5000); // Increased timeout to 5 seconds
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Restart the MCP process (used for recovery)
   */
  restartMcpProcess() {
    if (this.restartAttempts >= this.maxRestartAttempts) {
      console.error(
        `ERROR: Maximum restart attempts (${this.maxRestartAttempts}) reached. Giving up.`
      );
      return;
    }

    this.restartAttempts++;
    console.log(`Restarting MCP process (attempt ${this.restartAttempts})...`);

    // Clean up the old process
    if (this.mcpProcess) {
      try {
        this.mcpProcess.kill();
      } catch (error) {
        // Ignore errors when killing the process
      }
    }

    // Close the readline interface
    if (this.rl) {
      try {
        this.rl.close();
      } catch (error) {
        // Ignore errors when closing the readline interface
      }
    }

    // Reset state
    this.mcpProcess = null;
    this.rl = null;
    this.isReady = false;

    // Restart after a short delay
    setTimeout(() => {
      this.startServer().catch((error) => {
        console.error("ERROR: Failed to restart MCP process:", error);
      });
    }, 1000);
  }

  /**
   * List available tools from the MCP server
   *
   * @returns {Promise<Object>} A promise that resolves with the list of tools
   */
  async listTools() {
    return new Promise((resolve, reject) => {
      try {
        // Check if we have a connection to the MCP server
        if (
          (this.options.startServer &&
            (!this.mcpProcess ||
              this.mcpProcess.killed ||
              this.mcpProcess.exitCode !== null ||
              !this.mcpProcess.stdin ||
              !this.mcpProcess.stdin.writable)) ||
          (!this.options.startServer && (!this.socket || !this.socket.writable))
        ) {
          const error = new Error("No connection to MCP server available");
          error.details = {
            startServer: this.options.startServer,
            mcpProcess: this.options.startServer
              ? {
                  killed: this.mcpProcess?.killed,
                  exitCode: this.mcpProcess?.exitCode,
                  stdinWritable: this.mcpProcess?.stdin?.writable,
                }
              : null,
            socket: !this.options.startServer
              ? {
                  writable: this.socket?.writable,
                }
              : null,
          };
          console.error(
            "ERROR: Cannot list tools:",
            error.message,
            error.details
          );

          if (this.options.startServer) {
            // Try to restart the MCP process
            this.restartMcpProcess();
          }

          reject(error);
          return;
        }

        const requestId = this.nextRequestId++;

        // Create the request in JSON-RPC 2.0 format
        const request = {
          jsonrpc: "2.0",
          id: requestId.toString(),
          method: "tools/list",
          params: {},
        };

        if (this.options.debug) {
          console.log(
            "Sending tools/list request:",
            JSON.stringify(request, null, 2)
          );
        }

        // Register response handler
        this.responseHandlers.set(requestId.toString(), (response) => {
          if (response.result) {
            resolve(response.result);
          } else if (response.error) {
            console.error(
              "ERROR: Error listing tools:",
              response.error.message || "Unknown error"
            );
            reject(new Error(response.error.message || "Unknown error"));
          } else {
            console.error("ERROR: Invalid response from MCP server");
            reject(new Error("Invalid response from MCP server"));
          }
        });

        // Send the request
        this.sendRequest(request);
      } catch (error) {
        console.error("ERROR: Exception in listTools:", error);
        reject(error);
      }
    });
  }

  /**
   * Send a tweet
   *
   * @param {string} text - The text of the tweet
   * @param {string|null} replyToTweetId - Optional ID of a tweet to reply to
   * @returns {Promise<Object>} A promise that resolves with the result of sending the tweet
   */
  async sendTweet(text, replyToTweetId = null) {
    return new Promise((resolve, reject) => {
      try {
        // Check if we have a connection to the MCP server
        if (
          (this.options.startServer &&
            (!this.mcpProcess ||
              this.mcpProcess.killed ||
              this.mcpProcess.exitCode !== null ||
              !this.mcpProcess.stdin ||
              !this.mcpProcess.stdin.writable)) ||
          (!this.options.startServer && (!this.socket || !this.socket.writable))
        ) {
          const error = new Error("No connection to MCP server available");
          error.details = {
            startServer: this.options.startServer,
            mcpProcess: this.options.startServer
              ? {
                  killed: this.mcpProcess?.killed,
                  exitCode: this.mcpProcess?.exitCode,
                  stdinWritable: this.mcpProcess?.stdin?.writable,
                }
              : null,
            socket: !this.options.startServer
              ? {
                  writable: this.socket?.writable,
                }
              : null,
          };
          console.error(
            "ERROR: Cannot send tweet:",
            error.message,
            error.details
          );

          if (this.options.startServer) {
            // Try to restart the MCP process
            this.restartMcpProcess();
          }

          reject(error);
          return;
        }

        if (this.options.debug && this.options.startServer) {
          console.log("DEBUG: MCP process state before sending:", {
            pid: this.mcpProcess.pid,
            killed: this.mcpProcess.killed,
            exitCode: this.mcpProcess.exitCode,
            stdinWritable: this.mcpProcess.stdin.writable,
          });
        }

        const requestId = this.nextRequestId++;

        // Create the request in JSON-RPC 2.0 format
        // Based on our findings, the correct format is:
        // - method: "tools/call"
        // - params.name: The name of the tool
        // - params.arguments: The arguments for the tool (not args)
        const request = {
          jsonrpc: "2.0",
          id: requestId.toString(),
          method: "tools/call",
          params: {
            name: "send_tweet",
            arguments: {
              text: text,
            },
          },
        };

        // Add replyToTweetId if provided
        if (replyToTweetId) {
          request.params.arguments.replyToTweetId = replyToTweetId;
        }

        // Log the request for debugging
        if (this.options.debug) {
          console.log(
            "DEBUG: Sending tweet request:",
            JSON.stringify(request, null, 2)
          );
        }

        // Register response handler
        this.responseHandlers.set(requestId.toString(), (response) => {
          if (response.result) {
            resolve(response.result);
          } else if (response.error) {
            console.error(
              "ERROR: Error sending tweet:",
              response.error.message || "Unknown error"
            );
            reject(new Error(response.error.message || "Unknown error"));
          } else {
            console.error("ERROR: Invalid response from MCP server");
            reject(new Error("Invalid response from MCP server"));
          }
        });

        // Send the request
        this.sendRequest(request);
      } catch (error) {
        console.error("ERROR: Exception in sendTweet:", error);
        reject(error);
      }
    });
  }

  /**
   * Stop the MCP client
   */
  stop() {
    this.isExiting = true;

    if (this.options.debug) {
      console.log("DEBUG: Stopping MCP client");
    }

    // Close the readline interface
    if (this.rl) {
      if (this.options.debug) {
        console.log("DEBUG: Closing readline interface");
      }
      this.rl.close();
    }

    // Kill the MCP process if we started it
    if (this.options.startServer && this.mcpProcess) {
      if (this.options.debug) {
        console.log("DEBUG: Killing MCP process");
      }
      this.mcpProcess.kill();
    } else if (this.socket) {
      // Close the socket if we're connected to an existing server
      if (this.options.debug) {
        console.log("DEBUG: Closing socket connection");
      }
      this.socket.destroy();
    }
  }

  /**
   * Send a request to the MCP server
   *
   * @param {Object} request - The request to send
   */
  sendRequest(request) {
    if (this.options.startServer && this.mcpProcess && this.mcpProcess.stdin) {
      // Send the request to the MCP process's stdin
      this.mcpProcess.stdin.write(JSON.stringify(request) + "\n");
    } else if (this.socket) {
      // Send the request to the socket
      this.socket.write(JSON.stringify(request) + "\n");
    } else {
      throw new Error("No connection to MCP server available");
    }
  }
}
