# Use a Node.js 18 image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package.json files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy the rest of the code
COPY . .

# Expose port
EXPOSE 3000

# Run app
CMD ["npm", "start"]

