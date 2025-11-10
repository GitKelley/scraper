#!/usr/bin/env bash
set -e

echo "Installing npm dependencies..."
npm install

echo "Installing Playwright browsers..."
PLAYWRIGHT_BROWSERS_PATH=/opt/render/project/.cache/ms-playwright npx playwright install chromium

echo "Build complete!"

