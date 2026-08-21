import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Option 6: Continuous Single-Line Art Silhouette & Letter D Emblem
const SVG_CONTENT = `<svg width="512" height="512" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Luxury Gold Linear Gradient -->
    <linearGradient id="goldLineGrad" x1="12%" y1="10%" x2="88%" y2="90%">
      <stop offset="0%" stop-color="#FFF5D6"/>
      <stop offset="25%" stop-color="#E8C97A"/>
      <stop offset="55%" stop-color="#C49A3C"/>
      <stop offset="85%" stop-color="#9A7428"/>
      <stop offset="100%" stop-color="#6B4F14"/>
    </linearGradient>

    <!-- Shimmer Highlight Gradient -->
    <linearGradient id="shimmerLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.95"/>
      <stop offset="45%" stop-color="#F5E3B8" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#C49A3C" stop-opacity="0.7"/>
    </linearGradient>

    <!-- Deep Luxury Obsidian Radial Gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#241B16"/>
      <stop offset="68%" stop-color="#140F0D"/>
      <stop offset="100%" stop-color="#0A0807"/>
    </radialGradient>

    <!-- Soft Ambient Glow -->
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.8" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Base Dark Luxury Medallion -->
  <circle cx="50" cy="50" r="48" fill="url(#bgGrad)"/>
  
  <!-- Outer Gold Concentric Rims -->
  <circle cx="50" cy="50" r="47" stroke="url(#goldLineGrad)" stroke-width="1.8"/>
  <circle cx="50" cy="50" r="43" stroke="url(#shimmerLineGrad)" stroke-width="0.8" stroke-dasharray="2 3.5" stroke-opacity="0.5"/>

  <!-- Compass / Cardinal Luxury Accents -->
  <circle cx="50" cy="5.5" r="1.5" fill="url(#goldLineGrad)"/>
  <circle cx="94.5" cy="50" r="1.5" fill="url(#goldLineGrad)"/>
  <circle cx="50" cy="94.5" r="1.5" fill="url(#goldLineGrad)"/>
  <circle cx="5.5" cy="50" r="1.5" fill="url(#goldLineGrad)"/>

  <!-- Option 6: Continuous Line Art (Silhouette & Letter D) -->
  <g filter="url(#softGlow)">
    <!-- Head Contour -->
    <path d="M 37.5 19 C 33 19, 30 22.5, 30 27 C 30 31.5, 33 34.5, 36.5 35.5" stroke="url(#goldLineGrad)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- Feminine Spine, Neck, Waist & Hip Contour (Left Side) -->
    <path d="M 34.5 35.5 C 31.5 38.5, 27.5 44, 27.5 50 C 27.5 57, 31 63, 29.5 70 C 28 77, 26 80, 25 82" stroke="url(#goldLineGrad)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- Central Infinity / Hourglass Figure Curve -->
    <path d="M 36.5 35.5 C 40 40, 42 47, 39 53 C 36 59, 33 66, 35 73 C 37 80, 42 82, 42 82 C 42 82, 33 82, 30 76 C 27 70, 31 61, 35 56 C 39 51, 39 42, 35.5 36.5" stroke="url(#goldLineGrad)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- The Expansive Capital 'D' Dynamic Outer Wing -->
    <path d="M 36 35.5 C 56 35.5, 75 42, 75 58.5 C 75 74.5, 56 82, 36 82" stroke="url(#goldLineGrad)" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- Inner Aesthetic Light Flow Arc -->
    <path d="M 39 44 C 54 44, 64 49, 64 58.5 C 64 68, 54 73.5, 39 73.5" stroke="url(#shimmerLineGrad)" stroke-width="1.8" stroke-opacity="0.75" stroke-linecap="round"/>

    <!-- Precision Sparkle Dot -->
    <circle cx="53" cy="58.5" r="1.5" fill="url(#shimmerLineGrad)"/>
  </g>
</svg>`;

async function generate() {
  const publicDir = path.resolve('public');
  const appDir = path.resolve('src/app');

  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  if (!fs.existsSync(appDir)) fs.mkdirSync(appDir, { recursive: true });

  // 1. Write SVG icons
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), SVG_CONTENT, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), SVG_CONTENT, 'utf8');
  fs.writeFileSync(path.join(appDir, 'icon.svg'), SVG_CONTENT, 'utf8');

  console.log('Written SVG icons (Option 6)');

  const svgBuffer = Buffer.from(SVG_CONTENT);

  // 2. Generate PNG sizes
  const sizes = [
    { size: 16, name: 'favicon-16x16.png', dest: [publicDir] },
    { size: 32, name: 'favicon-32x32.png', dest: [publicDir, appDir] },
    { size: 48, name: 'favicon-48x48.png', dest: [publicDir] },
    { size: 180, name: 'apple-touch-icon.png', dest: [publicDir] },
    { size: 180, name: 'apple-icon.png', dest: [appDir] },
    { size: 192, name: 'icon-192.png', dest: [publicDir] },
    { size: 512, name: 'icon-512.png', dest: [publicDir] },
    { size: 32, name: 'icon.png', dest: [appDir] },
  ];

  for (const { size, name, dest } of sizes) {
    const pngBuffer = await sharp(svgBuffer)
      .resize(size, size)
      .png({ quality: 100, compressionLevel: 9 })
      .toBuffer();

    for (const dir of dest) {
      fs.writeFileSync(path.join(dir, name), pngBuffer);
    }
    console.log(`Generated ${name} (${size}x${size})`);
  }

  // 3. Generate favicon.ico
  const ico32Buffer = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico32Buffer);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), ico32Buffer);

  console.log('Generated favicon.ico successfully!');
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
