# Dockerfile for Render with Xvfb support for headed browser mode
FROM node:18-slim

# Install system dependencies for headed mode (Xvfb for virtual display)
# Xvfb allows running GUI applications on Linux servers without a physical display
RUN apt-get update && apt-get install -y \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files first (for better Docker layer caching)
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Install Playwright browsers
# Install chromium (not headless_shell) for headed mode support
RUN npx playwright install chromium
RUN npx playwright install-deps chromium

# Copy application files
COPY . .

# Expose port (Render will set PORT environment variable)
EXPOSE 3000

# Start Xvfb virtual display and run the application
# Xvfb runs in background (&) and sets DISPLAY=:99 for the browser
CMD ["sh", "-c", "Xvfb :99 -screen 0 1280x1024x24 & export DISPLAY=:99 && npm start"]

