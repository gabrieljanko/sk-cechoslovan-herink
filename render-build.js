#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('Starting Render build process...');

try {
  // Install dependencies
  console.log('Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });

  // Build client with proper paths
  console.log('Building client application...');
  process.chdir(path.join(__dirname, 'client'));
  execSync('npm run build', { stdio: 'inherit' });
  
  // Move back to root
  process.chdir(__dirname);
  
  // Build server
  console.log('Building server...');
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { stdio: 'inherit' });
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}