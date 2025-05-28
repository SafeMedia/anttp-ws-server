# Stage 1: Build AntTP using Rust nightly
FROM rustlang/rust:nightly-alpine as builder

# Install required build tools
RUN apk add --no-cache \
  git \
  musl-dev \
  gcc \
  protoc \
  protobuf-dev \
  build-base \
  cmake \
  pkgconfig

# Install rustfmt for nightly toolchain
RUN rustup component add rustfmt

# Clone AntTP repo
WORKDIR /build
RUN git clone https://github.com/traktion/AntTP.git anttp

# Build AntTP in release mode
WORKDIR /build/anttp
RUN cargo build --release

# Stage 2: Node.js + WebSocket server
FROM node:20-alpine

# Copy AntTP binary
COPY --from=builder /build/anttp/target/release/anttp /usr/local/bin/anttp
RUN chmod +x /usr/local/bin/anttp

# Set up your Node.js app
WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 8081

CMD ["sh", "-c", "anttp & npm start"]


