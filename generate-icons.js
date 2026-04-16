const fs = require('fs');
const path = require('path');

// Simple SVG icon for InterPulse
const createSVGIcon = (size, color = '#00008B') => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${color}" rx="${size * 0.2}"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" 
        font-family="Arial, sans-serif" font-size="${size * 0.3}" font-weight="bold" fill="white">
    IP
  </text>
  <circle cx="${size * 0.7}" cy="${size * 0.3}" r="${size * 0.08}" fill="#ff4444"/>
  <circle cx="${size * 0.3}" cy="${size * 0.3}" r="${size * 0.08}" fill="#4444ff"/>
</svg>`;
};

const sizes = [16, 32, 96, 144, 150, 180, 192, 310, 512];
const iconsDir = path.join(__dirname, 'public', 'icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG icons
sizes.forEach(size => {
  const svg = createSVGIcon(size);
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(iconsDir, filename);
  fs.writeFileSync(filepath, svg);
  console.log(`Generated: ${filename}`);
});

console.log('✅ SVG icons generated successfully!');
console.log('📁 Icons saved to: public/icons/');
console.log('');
console.log('⚠️  NOTE: For production, convert these SVG files to PNG format:');
console.log('   - Use online converters like https://convertio.co/svg-png/');
console.log('   - Or use tools like ImageMagick: convert icon-192x192.svg icon-192x192.png');
console.log('');
console.log('🔧 Required PNG files:');
sizes.forEach(size => {
  console.log(`   - icon-${size}x${size}.png`);
});
