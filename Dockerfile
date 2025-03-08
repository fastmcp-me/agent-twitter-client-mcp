# Use a Node.js image for building the server
FROM node:18-alpine as builder

# Set the working directory in the container
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Use a smaller Node.js image for the runtime
FROM node:18-alpine

# Set the working directory in the runtime image
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
# Use --ignore-scripts to prevent running the prepare script which requires tsc
RUN npm ci --omit=dev --ignore-scripts

# Copy built files from builder stage
COPY --from=builder /app/build ./build

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port
EXPOSE 3000

# Start the application
CMD ["node", "build/index.js"] 