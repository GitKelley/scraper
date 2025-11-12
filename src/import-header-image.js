/**
 * Script to import a header image from a file in the src directory
 * Usage: node src/import-header-image.js [filename]
 * If no filename is provided, it will look for common image filenames
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { setSetting } from './storage.js';
import { initializeDatabase } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database
initializeDatabase();

// Common image extensions to try
const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const commonNames = ['header-image', 'header', 'banner', 'hero'];

function findImageFile(filename) {
  const srcDir = __dirname;
  
  // If filename is provided, use it directly
  if (filename) {
    const filePath = path.join(srcDir, filename);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
    // Try with common extensions if no extension provided
    for (const ext of imageExtensions) {
      const filePathWithExt = path.join(srcDir, filename + ext);
      if (fs.existsSync(filePathWithExt)) {
        return filePathWithExt;
      }
    }
  }
  
  // Otherwise, search for common filenames
  const files = fs.readdirSync(srcDir);
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const name = path.basename(file, ext).toLowerCase();
    
    if (imageExtensions.includes(ext) && commonNames.includes(name)) {
      return path.join(srcDir, file);
    }
  }
  
  return null;
}

function imageToBase64(filePath) {
  const imageBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase().slice(1); // Remove the dot
  const mimeType = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp'
  }[ext] || 'image/jpeg';
  
  const base64 = imageBuffer.toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

// Main function
const filename = process.argv[2];
const imagePath = findImageFile(filename);

if (!imagePath) {
  console.error('No image file found in src directory.');
  console.error('Please place an image file named "header-image.jpg" (or .png, .gif, etc.) in the src directory,');
  console.error('or provide the filename as an argument: node src/import-header-image.js <filename>');
  process.exit(1);
}

try {
  console.log(`Found image file: ${path.basename(imagePath)}`);
  const base64Image = imageToBase64(imagePath);
  setSetting('headerImage', base64Image);
  console.log('✓ Header image imported successfully!');
  console.log(`  File: ${path.basename(imagePath)}`);
  console.log(`  Size: ${(fs.statSync(imagePath).size / 1024).toFixed(2)} KB`);
} catch (error) {
  console.error('Error importing header image:', error);
  process.exit(1);
}

