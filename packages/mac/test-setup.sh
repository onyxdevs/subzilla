#!/bin/bash

# Subzilla Mac App Test Setup Script
echo "🦎 Setting up Subzilla Mac App for testing..."

# Navigate to mac package
cd "$(dirname "$0")"

echo "📦 Installing dependencies..."
# Install dependencies without workspace resolution issues
npm install --no-package-lock electron@31.0.0 electron-builder@24.0.0 electron-store@8.1.0 electron-updater@6.1.0 typescript@5.9.2 @types/node@24.3.0

echo "🔧 Building TypeScript..."
# Build with relaxed settings for testing
npx tsc --skipLibCheck --noEmit false

echo "🚀 Ready to test!"
echo ""
echo "To run the app:"
echo "  npx electron ."
echo ""
echo "To build distribution:"
echo "  npx electron-builder"
echo ""
echo "Note: You may need to:"
echo "1. Add icon.icns to assets/ directory"
echo "2. Install @subzilla/core and @subzilla/types dependencies"
echo "3. Build the core packages first"