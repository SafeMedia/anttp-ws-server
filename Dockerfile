# use official Node.js base image
FROM node:20-alpine

# Install git and other dependencies
RUN apk add --no-cache git

# Create a workspace directory
WORKDIR /workspace

# Clone AntTP
RUN git clone https://github.com/traktion/AntTP.git anttp

# Install and build AntTP
WORKDIR /workspace/anttp
RUN npm install && npm run build

# Copy your WebSocket server into /app
WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
# Build your TypeScript server
RUN npm run build

# Expose server port
EXPOSE 8080

# Start your server
CMD ["npm", "start"]
