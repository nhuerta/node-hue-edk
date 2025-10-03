#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const platform = process.platform;
const arch = process.arch;
const platformDir = `${platform}-${arch}`;

const sourceFile = path.join(__dirname, '..', 'native', 'build', 'Release', 'hue_edk.node');
const targetDir = path.join(__dirname, '..', 'prebuilds', platformDir);
const targetFile = path.join(targetDir, 'hue_edk.node');

// Check if source exists
if (!fs.existsSync(sourceFile)) {
    console.error('Error: Built binary not found at:', sourceFile);
    console.error('   Run "npm run build" first');
    process.exit(1);
}

// Create target directory
fs.mkdirSync(targetDir, { recursive: true });

// Copy binary
fs.copyFileSync(sourceFile, targetFile);

// Show success
const stats = fs.statSync(targetFile);
const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
console.log(`Deployed binary to prebuilds/${platformDir}/`);
console.log(`  Size: ${sizeMB} MB`);
console.log(`  Platform: ${platform}`);
console.log(`  Architecture: ${arch}`);
