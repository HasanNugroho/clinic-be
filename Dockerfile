# use base image for build
FROM node:23-alpine AS builder

# Set working directory
WORKDIR /app

# copy package json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Production image
FROM node:23-alpine

WORKDIR /app

# Copy the build result and package.json files to the final image
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Start the application
CMD ["node", "dist/main.js"]
