# Stage 1: Build AntTP using Rust nightly
FROM rustlang/rust:nightly-alpine as builder

# Install build dependencies
RUN apk add --no-cache git musl-dev gcc

# Clone AntTP repo
WORKDIR /build
RUN git clone https://github.com/traktion/AntTP.git anttp

# Build AntTP in release mode
WORKDIR /build/anttp
RUN cargo build --release

# Stage 2: Final image with Node.js server + built AntTP
FROM node:20-alpine

# Copy AntTP binary from builder stage
COPY --from=builder /build/anttp/target/release/anttp /usr/local/bin/anttp
RUN chmod +x /usr/local/bin/anttp

# Set up your Node.js app
WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Expose your server port
EXPOSE 8080

# Start both AntTP and your server
CMD ["sh", "-c", "anttp & npm start"]
