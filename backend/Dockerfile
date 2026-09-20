FROM node:18-alpine

WORKDIR /app

# Copy package requirements and install dependencies
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

# Copy backend files
COPY . .

# Expose server port
EXPOSE 5000

CMD ["node", "src/app.js"]
