# Use Node.js LTS version
FROM node:18-slim

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the application code
COPY . .

EXPOSE 3001
CMD ["node", "backend/server.js"]