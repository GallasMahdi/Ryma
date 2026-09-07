import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT_DIR = process.cwd();
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const APP_DIR = path.join(ROOT_DIR, 'src', 'app');

// Ensure directories exist
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
if (!fs.existsSync(APP_DIR)) fs.mkdirSync(APP_DIR, { recursive: true });

// Read the official light/white logo mark from public/logo-mark-light.png
const logoLightPath = path.join(PUBLIC_DIR, 'logo-mark-light.png');
if (!fs.existsSync(logoLightPath)) {
  console.error('Missing logo-mark-light.png at', logoLightPath);
  process.exit(1);
}

const logoLightBase64 = fs.readFileSync(logoLightPath).toString('base64');

// High-resolution SVG Master Favicon
// White and Black luxury design: Deep obsidian black badge (#0A0E14) with crisp white border (#FFFFFF)
// and the iconic navbar D C monogram & silhouette in pure white (#FFFFFF).
const masterSvg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Outer Rounded Squircle Badge with crisp white border -->
  <rect x="20" y="20" width="472" height="472" rx="116" fill="#0A0E14" stroke="#FFFFFF" stroke-width="16" stroke-opacity="0.88" />
  
  <!-- Subtle inner platinum rim -->
  <rect x="36" y="36" width="440" height="440" rx="100" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-opacity="0.25" />
  
  <!-- Iconic D C Emblem Centerpiece (exact navbar logo mark) -->
  <image x="64" y="64" width="384" height="384" href="data:image/png;base64,${logoLightBase64}" />
</svg>`;

async function main() {
  console.log('Generating white and black D C luxury favicons...');

  const svgBuffer = Buffer.from(masterSvg);

  // 1. Write SVG favicons
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.svg'), masterSvg, 'utf8');
  fs.writeFileSync(path.join(PUBLIC_DIR, 'icon.svg'), masterSvg, 'utf8');
  fs.writeFileSync(path.join(APP_DIR, 'icon.svg'), masterSvg, 'utf8');
  console.log('✓ Written SVG favicons (public/favicon.svg, public/icon.svg, src/app/icon.svg)');

  // 2. Generate PNG sizes with sharp
  const sizes = [
    { size: 16, name: 'favicon-16x16.png', publicOnly: true },
    { size: 32, name: 'favicon-32x32.png', appName: 'icon.png' },
    { size: 48, name: 'favicon-48x48.png', appName: 'favicon-48x48.png' },
    { size: 48, name: 'logo-48x48.png', publicOnly: true },
    { size: 180, name: 'apple-touch-icon.png', appName: 'apple-icon.png' },
    { size: 192, name: 'icon-192.png', publicOnly: true },
    { size: 512, name: 'icon-512.png', publicOnly: true },
  ];

  const pngBuffers = {};

  for (const { size, name, appName, publicOnly } of sizes) {
    let pipeline = sharp(svgBuffer).resize(size, size, { fit: 'contain' });
    
    // For small favicon sizes, enhance sharpness for crisp visibility
    if (size <= 32) {
      pipeline = pipeline.sharpen({ sigma: 1.1, m1: 1.5, m2: 0.7 });
    }

    const buf = await pipeline.png({ compressionLevel: 9, quality: 100 }).toBuffer();
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

  // Also write 32x32 to src/app/favicon-32x32.png
  fs.writeFileSync(path.join(APP_DIR, 'favicon-32x32.png'), pngBuffers[32]);

  // 3. Create multi-image ICO file (16x16, 32x32, 48x48)
  const icoBuffer = createIco([
    { size: 16, buffer: pngBuffers[16] },
    { size: 32, buffer: pngBuffers[32] },
    { size: 48, buffer: pngBuffers[48] },
  ]);

  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(APP_DIR, 'favicon.ico'), icoBuffer);
  console.log('✓ Generated multi-res favicon.ico (16, 32, 48px) for public/ and src/app/');

  // 4. Update site.webmanifest
  const manifest = {
    name: 'Digital Clínica — Fisioterapia & Estética Avançada',
    short_name: 'Digital Clínica',
    description: 'Clínica de fisioterapia médica e estética avançada em Lisboa.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0A0E14',
    theme_color: '#0A0E14',
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
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

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
