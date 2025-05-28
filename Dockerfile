# Use official Node.js and Rust base image
FROM rust:1.77-alpine AS builder

# Install build tools and Git
RUN apk add --no-cache git musl-dev gcc nodejs npm

# Clone and build AntTP
WORKDIR /build
RUN git clone https://github.com/traktion/AntTP.git anttp
WORKDIR /build/anttp
RUN cargo build --release

# Now move to a separate Node.js image for the final app
FROM node:20-alpine

# Copy the built AntTP binary from the builder
COPY --from=builder /build/anttp/target/release/anttp /usr/local/bin/anttp

# Make sure it's executable
RUN chmod +x /usr/local/bin/anttp

# Set up Node.js app
WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Expose the server port
EXPOSE 8080

# Start both AntTP and your Node.js app
CMD ["sh", "-c", "anttp & npm start"]
