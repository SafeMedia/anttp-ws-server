# use official Node.js base image
FROM node:20-alpine

# Install git and other dependencies
RUN apk add --no-cache git

# Clone and build AntTP
RUN git clone https://github.com/traktion/AntTP.git /anttp \
    && cd /anttp \
    && npm install \
    && npm run build

# create app directory
WORKDIR /app

# Copy server code
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Expose the AntTP port and WebSocket server port
EXPOSE 3000
EXPOSE 8080

# Start both AntTP and your WebSocket server using a process manager
RUN npm install -g concurrently
CMD concurrently \
    "node /anttp/dist/index.js" \
    "npm start"
