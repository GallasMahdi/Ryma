import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generateFavicons() {
  const publicDir = path.resolve('public');
  const appDir = path.resolve('src/app');
  const src = path.join(publicDir, 'logo1.png');

  if (!fs.existsSync(src)) {
    console.error('Source logo1.png not found at', src);
    process.exit(1);
  }

  // 1. Extract raw monogram mark from logo1.png (bbox: 231, 78, 118, 164)
  const markBuffer = await sharp(src)
    .extract({ left: 231, top: 78, width: 118, height: 164 })
    .toBuffer();

  // 2. Convert monogram to bright luminous white/champagne gold (#FFFFFF / #F8F5EE)
  const { data: rawData, info: rawInfo } = await sharp(markBuffer).raw().toBuffer({ resolveWithObject: true });
  const brightData = Buffer.from(rawData);
  for (let i = 0; i < brightData.length; i += 4) {
    const a = brightData[i + 3];
    if (a > 15) {
      brightData[i] = 255;     // R
      brightData[i + 1] = 252; // G
      brightData[i + 2] = 245; // B
      brightData[i + 3] = Math.min(255, Math.round(a * 1.3));
    }
  }

  const brightMarkBuffer = await sharp(brightData, {
    raw: { width: rawInfo.width, height: rawInfo.height, channels: 4 }
  }).png().toBuffer();

  // 3. Create high-contrast luxury circular badge (512x512)
  // Ensures 100% visibility on black tabs, dark mode, light mode, and bookmarks
  const size = 512;
  const bgSvg = Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="badgeBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#242E38" />
          <stop offset="65%" stop-color="#141A21" />
          <stop offset="100%" stop-color="#0A0E13" />
        </radialGradient>
        <linearGradient id="goldRim" x1="10%" y1="10%" x2="90%" y2="90%">
          <stop offset="0%" stop-color="#FFFFFF" />
          <stop offset="25%" stop-color="#F5E3B8" />
          <stop offset="50%" stop-color="#C49A3C" />
          <stop offset="80%" stop-color="#9A7428" />
          <stop offset="100%" stop-color="#E8C97A" />
        </linearGradient>
      </defs>
      <!-- Base Circular Medallion -->
      <circle cx="256" cy="256" r="244" fill="url(#badgeBg)" />
      <!-- Outer Precision Gold Rim -->
      <circle cx="256" cy="256" r="240" fill="none" stroke="url(#goldRim)" stroke-width="16" />
      <!-- Inner Thin Platinum Ring -->
      <circle cx="256" cy="256" r="226" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-opacity="0.35" stroke-dasharray="8 6" />
    </svg>
  `);

  // Resize bright mark to 230x320 and composite onto 512x512 medallion
  const resizedBrightMark = await sharp(brightMarkBuffer)
    .resize(230, 320, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const masterFavicon = await sharp(bgSvg)
    .composite([{ input: resizedBrightMark, top: 96, left: 141 }])
    .png({ quality: 100 })
    .toBuffer();

  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), masterFavicon);

  // 4. Generate all PNG icon sizes
  const sizes = [
    { size: 16, name: 'favicon-16x16.png', dest: [publicDir] },
    { size: 32, name: 'favicon-32x32.png', dest: [publicDir, appDir] },
    { size: 48, name: 'favicon-48x48.png', dest: [publicDir] },
    { size: 48, name: 'logo-48x48.png', dest: [publicDir] },
    { size: 180, name: 'apple-touch-icon.png', dest: [publicDir] },
    { size: 180, name: 'apple-icon.png', dest: [appDir] },
    { size: 192, name: 'icon-192.png', dest: [publicDir] },
    { size: 512, name: 'icon-512.png', dest: [publicDir] },
    { size: 32, name: 'icon.png', dest: [appDir] },
  ];

  for (const { size: sz, name, dest } of sizes) {
    const pngBuffer = await sharp(masterFavicon)
      .resize(sz, sz)
      .png({ quality: 100, compressionLevel: 9 })
      .toBuffer();

    for (const dir of dest) {
      fs.writeFileSync(path.join(dir, name), pngBuffer);
    }
    console.log(`Generated ${name} (${sz}x${sz})`);
  }

  // 5. Generate Multi-Size favicon.ico (32x32)
  const ico32Buffer = await sharp(masterFavicon).resize(32, 32).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico32Buffer);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), ico32Buffer);

  // 6. Generate crisp SVG favicons
  const svgFavicon = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#242E38"/>
      <stop offset="65%" stop-color="#141A21"/>
      <stop offset="100%" stop-color="#0A0E13"/>
    </radialGradient>
    <linearGradient id="gold" x1="10%" y1="10%" x2="90%" y2="90%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="30%" stop-color="#F5E3B8"/>
      <stop offset="60%" stop-color="#C49A3C"/>
      <stop offset="100%" stop-color="#E8C97A"/>
    </linearGradient>
  </defs>
  <circle cx="256" cy="256" r="244" fill="url(#bg)"/>
  <circle cx="256" cy="256" r="240" fill="none" stroke="url(#gold)" stroke-width="16"/>
  <circle cx="256" cy="256" r="226" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-opacity="0.35" stroke-dasharray="8 6"/>
  <g transform="translate(141, 96)">
    <!-- High-DPI Monogram & Silhouette -->
    <path d="M 50 18 C 36 18, 26 29, 26 43 C 26 57, 36 67, 47 70" stroke="url(#gold)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M 40 70 C 31 80, 18 97, 18 116 C 18 138, 29 157, 24 179 C 20 201, 14 210, 11 216" stroke="url(#gold)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M 47 70 C 58 84, 64 106, 55 125 C 46 144, 37 166, 43 188 C 49 210, 64 216, 64 216 C 64 216, 36 216, 27 197 C 18 178, 31 150, 43 134 C 55 119, 55 92, 44 73" stroke="url(#gold)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M 45 70 C 109 70, 170 91, 170 144 C 170 195, 109 216, 45 216" stroke="url(#gold)" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;

  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgFavicon);
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgFavicon);
  fs.writeFileSync(path.join(appDir, 'icon.svg'), svgFavicon);

  console.log('Successfully generated all high-contrast favicons for dark and light tabs!');
}

generateFavicons().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
const ico32 = await sharp(crispWhite512)
  .resize(32, 32, { kernel: sharp.kernel.lanczos3 })
  .png()
  .toBuffer();
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico32);
fs.writeFileSync(path.join(appDir, 'favicon.ico'), ico32);

// 8. Write crisp SVG favicon (pure white emblem)
const base64Png = crispWhite512.toString('base64');
const pureSvg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <image width="512" height="512" href="data:image/png;base64,${base64Png}" />
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), pureSvg);
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), pureSvg);
fs.writeFileSync(path.join(appDir, 'icon.svg'), pureSvg);

console.log('Successfully generated bold crisp white favicons for dark tabs!');
}

buildCrispWhiteFavicons().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
