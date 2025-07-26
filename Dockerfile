# Use an official Node LTS image as parent
FROM node:22-alpine

# Set working directory in container
WORKDIR /usr/src/app

# Copy only package manifests first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of the source code
COPY . .

# Build the TypeScript project
RUN npm run build

# Expose port (change if your server uses a different port)
EXPOSE 8000

# Start the app
CMD ["npm", "start"]
