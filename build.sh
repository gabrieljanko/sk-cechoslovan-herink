#!/bin/bash
# Build script for Render deployment

echo "Installing dependencies..."
npm install

echo "Building client..."
npx vite build

echo "Building server..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "Build complete!"