FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package.json package-lock.json* ./
RUN npm install

# Copy the rest of the backend source code
COPY . .

EXPOSE 3001
CMD ["node", "server.js"]