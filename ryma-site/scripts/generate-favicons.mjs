import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const SVG_CONTENT = `<svg width="512" height="512" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Luxury Gold Gradient (Rich metallic luster) -->
    <linearGradient id="goldGrad" x1="12%" y1="12%" x2="88%" y2="88%">
      <stop offset="0%" stop-color="#FFF5D6"/>
      <stop offset="25%" stop-color="#E8C97A"/>
      <stop offset="55%" stop-color="#C49A3C"/>
      <stop offset="85%" stop-color="#9A7428"/>
      <stop offset="100%" stop-color="#6B4F14"/>
    </linearGradient>

    <!-- Shimmer Highlight Gradient -->
    <linearGradient id="shimmerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.95"/>
      <stop offset="45%" stop-color="#F5E3B8" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#C49A3C" stop-opacity="0.7"/>
    </linearGradient>

    <!-- Deep Luxury Obsidian Radial Gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#241B16"/>
      <stop offset="65%" stop-color="#140F0D"/>
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
  <circle cx="50" cy="50" r="47" stroke="url(#goldGrad)" stroke-width="2"/>
  <circle cx="50" cy="50" r="42.5" stroke="url(#shimmerGrad)" stroke-width="0.8" stroke-dasharray="2 3.5" stroke-opacity="0.6"/>

  <!-- Compass/Luxury Cardinal Accents -->
  <circle cx="50" cy="5.5" r="1.6" fill="url(#goldGrad)"/>
  <circle cx="94.5" cy="50" r="1.6" fill="url(#goldGrad)"/>
  <circle cx="50" cy="94.5" r="1.6" fill="url(#goldGrad)"/>
  <circle cx="5.5" cy="50" r="1.6" fill="url(#goldGrad)"/>

  <!-- Central Therapeutic Monogram & Emblem: Posture Spine + Elegant "D" & Diamond -->
  <g filter="url(#softGlow)">
    <!-- Spine Vertical Curve (Therapeutic Alignment) -->
    <path d="M33 24 C 33 24, 38 40, 36 52 C 34 64, 33 76, 33 76" stroke="url(#goldGrad)" stroke-width="3.6" stroke-linecap="round"/>

    <!-- Spine Serifs -->
    <path d="M26.5 24 L39.5 24" stroke="url(#goldGrad)" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M26.5 76 L39.5 76" stroke="url(#goldGrad)" stroke-width="2.6" stroke-linecap="round"/>

    <!-- Outer Harmonic "D" Arc -->
    <path d="M35 24.5 C 57 24.5, 76 35, 76 50 C 76 65, 57 75.5, 35 75.5" stroke="url(#goldGrad)" stroke-width="3.8" stroke-linecap="round"/>

    <!-- Inner Beauty & Wellness Contour -->
    <path d="M36 34.5 C 48 34.5, 62.5 41.5, 62.5 50 C 62.5 58.5, 48 65.5, 36 65.5" stroke="url(#shimmerGrad)" stroke-width="1.8" stroke-opacity="0.8" stroke-linecap="round"/>

    <!-- Central Precision Diamond Star -->
    <path d="M51.5 44 Q 51.5 50, 57.5 50 Q 51.5 50, 51.5 56 Q 51.5 50, 45.5 50 Q 51.5 50, 51.5 44 Z" fill="url(#shimmerGrad)"/>
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

  console.log('Written SVG icons');

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

  // 3. Generate favicon.ico (multi-resolution ICO or standard 32x32 / 48x48)
  const ico32Buffer = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico32Buffer);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), ico32Buffer);

  console.log('Generated favicon.ico successfully!');
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
