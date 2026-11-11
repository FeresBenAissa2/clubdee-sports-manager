#!/usr/bin/env node

/**
 * Generate PWA icons from SVG
 * This script creates placeholder icons for the PWA
 * In production, replace with actual branded icons
 */

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create a simple SVG icon
const createSVGIcon = (size) => {
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#2563eb"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size/3}" fill="#ffffff"/>
  <path d="M ${size/2 - size/6} ${size/2} L ${size/2} ${size/2 - size/6} L ${size/2 + size/6} ${size/2} L ${size/2} ${size/2 + size/6} Z" fill="#2563eb"/>
</svg>`;
};

// Generate icons for each size
sizes.forEach(size => {
  const svg = createSVGIcon(size);
  const filename = `icon-${size}x${size}.png`;
  const filepath = path.join(iconsDir, filename);
  
  // For now, save as SVG (in production, convert to PNG)
  const svgFilename = `icon-${size}x${size}.svg`;
  const svgFilepath = path.join(iconsDir, svgFilename);
  fs.writeFileSync(svgFilepath, svg);
  
  console.log(`Created ${svgFilename}`);
});

console.log('\nPWA icons generated successfully!');
console.log('Note: SVG files created. For production, convert to PNG using an image processing tool.');
