# use official Node.js base image
FROM node:20-alpine

# create app directory
WORKDIR /app

# copy package.json and package-lock.json
COPY package*.json ./

# install dependencies
RUN npm install

# oopy source code
COPY . .

# build the TypeScript code
RUN npm run build

# Expose the port (default 8080)
EXPOSE 8080

# start the server
CMD ["npm", "start"]
