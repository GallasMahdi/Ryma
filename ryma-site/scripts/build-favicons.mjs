import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT_DIR = process.cwd();
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const APP_DIR = path.join(ROOT_DIR, 'src', 'app');

// 1. Read light logo mark (white / warm silhouette)
const logoLightPath = path.join(PUBLIC_DIR, 'logo-mark-light.png');
const logoDarkPath = path.join(PUBLIC_DIR, 'logo-mark.png');

if (!fs.existsSync(logoLightPath)) {
  console.error('Missing logo-mark-light.png');
  process.exit(1);
}

const logoLightBase64 = fs.readFileSync(logoLightPath).toString('base64');

// High-resolution Vector/SVG Master Favicon
// Luxury dark squircle (#1A1412) with subtle radial gradient, dual-stop gold border (#F5E9C8 -> #C49A3C -> #8A6A24),
// and the crisp white/gold monogram emblem centered perfectly.
const masterSvg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="badgeBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#241C18" />
      <stop offset="50%" stop-color="#1A1412" />
      <stop offset="100%" stop-color="#0E0A09" />
    </linearGradient>
    <linearGradient id="goldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCEFC7" />
      <stop offset="35%" stop-color="#E8C97A" />
      <stop offset="70%" stop-color="#C49A3C" />
      <stop offset="100%" stop-color="#8A6A24" />
    </linearGradient>
    <filter id="goldGlow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#C49A3C" flood-opacity="0.25" />
    </filter>
  </defs>
  
  <!-- Outer Rounded Squircle Badge with Glow & Gold Bezel -->
  <rect x="20" y="20" width="472" height="472" rx="116" fill="url(#badgeBg)" stroke="url(#goldBorder)" stroke-width="18" filter="url(#goldGlow)" />
  
  <!-- Inner subtle gold border accent -->
  <rect x="36" y="36" width="440" height="440" rx="100" fill="none" stroke="#C49A3C" stroke-width="2" stroke-opacity="0.35" />
  
  <!-- Emblem Centerpiece -->
  <image x="72" y="72" width="368" height="368" href="data:image/png;base64,${logoLightBase64}" />
</svg>`;

async function main() {
  console.log('Generating production-ready luxury favicons...');

  const svgBuffer = Buffer.from(masterSvg);

  // Write SVGs
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.svg'), masterSvg);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'icon.svg'), masterSvg);
  fs.writeFileSync(path.join(APP_DIR, 'icon.svg'), masterSvg);
  console.log('✓ Written SVG favicons (public/favicon.svg, public/icon.svg, src/app/icon.svg)');

  // Generate PNG sizes with sharp
  const sizes = [
    { size: 16, name: 'favicon-16x16.png', publicOnly: true },
    { size: 32, name: 'favicon-32x32.png', appName: 'icon.png' },
    { size: 48, name: 'favicon-48x48.png', appName: 'favicon-48x48.png' },
    { size: 180, name: 'apple-touch-icon.png', appName: 'apple-icon.png' },
    { size: 192, name: 'icon-192.png', publicOnly: true },
    { size: 512, name: 'icon-512.png', publicOnly: true },
  ];

  const pngBuffers = {};

  for (const { size, name, appName, publicOnly } of sizes) {
    const buf = await sharp(svgBuffer)
      .resize(size, size, { fit: 'contain' })
      .png({ compressionLevel: 9, quality: 100 })
      .toBuffer();

    pngBuffers[size] = buf;

    // Write to public
    fs.writeFileSync(path.join(PUBLIC_DIR, name), buf);
    console.log(`✓ Generated public/${name} (${size}x${size})`);

    // Write to app directory if required
    if (appName) {
      fs.writeFileSync(path.join(APP_DIR, appName), buf);
      console.log(`✓ Generated src/app/${appName} (${size}x${size})`);
    }
  }

  // Also write 32x32 to src/app/favicon-32x32.png if it exists
  fs.writeFileSync(path.join(APP_DIR, 'favicon-32x32.png'), pngBuffers[32]);

  // Create multi-image ICO file (16x16, 32x32, 48x48)
  const icoBuffer = createIco([
    { size: 16, buffer: pngBuffers[16] },
    { size: 32, buffer: pngBuffers[32] },
    { size: 48, buffer: pngBuffers[48] },
  ]);

  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(APP_DIR, 'favicon.ico'), icoBuffer);
  console.log('✓ Generated multi-res favicon.ico (16, 32, 48px) for public/ and src/app/');

  // Web App Manifest
  const manifest = {
    name: 'Digital Clínica — Fisioterapia & Estética Avançada',
    short_name: 'Digital Clínica',
    description: 'Clínica de fisioterapia médica e estética avançada em Lisboa.',
    start_url: '/',
    display: 'standalone',
    background_color: '#1A1412',
    theme_color: '#1A1412',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };

  fs.writeFileSync(
    path.join(PUBLIC_DIR, 'site.webmanifest'),
    JSON.stringify(manifest, null, 2)
  );
  console.log('✓ Generated public/site.webmanifest');
}

/**
 * Creates standard ICO binary buffer embedding PNG images
 */
function createIco(images) {
  // ICO header: 6 bytes
  // Reserved (2 bytes) = 0
  // Type (2 bytes) = 1 (ICO)
  // Count (2 bytes) = images.length
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  // Directory entries: 16 bytes each
  const dirSize = images.length * 16;
  const dir = Buffer.alloc(dirSize);
  let currentOffset = 6 + dirSize;

  const imageBuffers = [];

  images.forEach((img, idx) => {
    const entryOffset = idx * 16;
    const width = img.size >= 256 ? 0 : img.size;
    const height = img.size >= 256 ? 0 : img.size;
    const colorCount = 0;
    const reserved = 0;
    const planes = 1;
    const bitCount = 32;
    const bytesInRes = img.buffer.length;

    dir.writeUInt8(width, entryOffset + 0);
    dir.writeUInt8(height, entryOffset + 1);
    dir.writeUInt8(colorCount, entryOffset + 2);
    dir.writeUInt8(reserved, entryOffset + 3);
    dir.writeUInt16LE(planes, entryOffset + 4);
    dir.writeUInt16LE(bitCount, entryOffset + 6);
    dir.writeUInt32LE(bytesInRes, entryOffset + 8);
    dir.writeUInt32LE(currentOffset, entryOffset + 12);

    imageBuffers.push(img.buffer);
    currentOffset += bytesInRes;
  });

  return Buffer.concat([header, dir, ...imageBuffers]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
