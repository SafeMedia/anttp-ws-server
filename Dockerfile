FROM node:20-alpine

# install dependencies needed for anttp
RUN apk add --no-cache git bash

# install anttp globally (you may want to pin a version)
RUN npm install -g anttp

WORKDIR /app

# copy package.json and package-lock.json and install deps
COPY package*.json ./
RUN npm install

# Copy source files
COPY src ./src

# build typescript
RUN npm run build

EXPOSE 8080

CMD ["node", "dist/server.js"]
