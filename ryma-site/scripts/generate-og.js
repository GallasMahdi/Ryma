const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createOgImage() {
  const width = 1200;
  const height = 630;

  const svg = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#080D1A" />
        <stop offset="50%" stop-color="#0F172A" />
        <stop offset="100%" stop-color="#1E1B4B" />
      </linearGradient>
      <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#D4AF37" />
        <stop offset="50%" stop-color="#F3E5AB" />
        <stop offset="100%" stop-color="#AA7C11" />
      </linearGradient>
      <radialGradient id="circleGlow" cx="50%" cy="45%" r="50%">
        <stop offset="0%" stop-color="#7C3AED" stop-opacity="0.30" />
        <stop offset="100%" stop-color="#0A0D1A" stop-opacity="0" />
      </radialGradient>
    </defs>

    <!-- Background -->
    <rect width="${width}" height="${height}" fill="url(#bg)" />
    <circle cx="600" cy="280" r="420" fill="url(#circleGlow)" />

    <!-- Subtle luxury grid / border -->
    <rect x="30" y="30" width="1140" height="570" rx="24" fill="none" stroke="rgba(212, 175, 55, 0.28)" stroke-width="1.5" />
    <rect x="42" y="42" width="1116" height="546" rx="16" fill="none" stroke="rgba(255, 255, 255, 0.06)" stroke-width="1" />

    <!-- Top Badge -->
    <g transform="translate(600, 110)">
      <rect x="-170" y="-18" width="340" height="36" rx="18" fill="rgba(124, 58, 237, 0.28)" stroke="rgba(167, 139, 250, 0.45)" stroke-width="1" />
      <text x="0" y="5" fill="#C4B5FD" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" letter-spacing="2" text-anchor="middle">LISBOA • PORTUGAL</text>
    </g>

    <!-- Main Title -->
    <text x="600" y="255" fill="url(#gold)" font-family="Georgia, 'Times New Roman', serif" font-size="64" font-weight="700" letter-spacing="1.5" text-anchor="middle">
      DIGITAL CLÍNICA
    </text>

    <!-- Subtitle -->
    <text x="600" y="325" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="600" letter-spacing="0.5" text-anchor="middle">
      Fisioterapia Médica &amp; Estética Avançada
    </text>

    <text x="600" y="375" fill="#94A3B8" font-family="system-ui, -apple-system, sans-serif" font-size="19" font-weight="400" text-anchor="middle">
      RPG • Pavimento Pélvico • Drenagem Linfática • Radiofrequência • Criolipólise
    </text>

    <!-- Bottom Feature Pills -->
    <g transform="translate(600, 485)">
      <!-- Pill 1 -->
      <g transform="translate(-320, 0)">
        <rect x="-110" y="-20" width="220" height="40" rx="20" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" stroke-width="1" />
        <text x="0" y="6" fill="#F1F5F9" font-family="system-ui, sans-serif" font-size="15" font-weight="500" text-anchor="middle">&#10003; Marcação Online 24/7</text>
      </g>
      <!-- Pill 2 -->
      <g transform="translate(0, 0)">
        <rect x="-110" y="-20" width="220" height="40" rx="20" fill="rgba(16, 185, 129, 0.18)" stroke="rgba(16, 185, 129, 0.4)" stroke-width="1" />
        <text x="0" y="6" fill="#34D399" font-family="system-ui, sans-serif" font-size="15" font-weight="600" text-anchor="middle">&#10003; Triagem Anatómica 3D</text>
      </g>
      <!-- Pill 3 -->
      <g transform="translate(320, 0)">
        <rect x="-110" y="-20" width="220" height="40" rx="20" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" stroke-width="1" />
        <text x="0" y="6" fill="#F1F5F9" font-family="system-ui, sans-serif" font-size="15" font-weight="500" text-anchor="middle">&#10003; Reembolsos ADSE / Médis</text>
      </g>
    </g>

    <!-- Footer URL -->
    <text x="600" y="565" fill="rgba(212, 175, 55, 0.9)" font-family="monospace" font-size="16" font-weight="700" letter-spacing="1.5" text-anchor="middle">
      digitalclinica.pt
    </text>
  </svg>
  `;

  const svgBuffer = Buffer.from(svg);

  // High-performance, lightweight JPEG (~85KB)
  await sharp(svgBuffer)
    .jpeg({ quality: 90, progressive: true })
    .toFile(path.join(__dirname, '../public/og-image.jpg'));

  // High-performance, lightweight PNG (~110KB)
  await sharp(svgBuffer)
    .png({ quality: 90, compressionLevel: 8 })
    .toFile(path.join(__dirname, '../public/og-image.png'));

  // Copy to src/app for Next.js App Router static open graph
  fs.copyFileSync(path.join(__dirname, '../public/og-image.jpg'), path.join(__dirname, '../src/app/opengraph-image.jpg'));
  fs.copyFileSync(path.join(__dirname, '../public/og-image.png'), path.join(__dirname, '../src/app/opengraph-image.png'));
  fs.copyFileSync(path.join(__dirname, '../public/og-image.jpg'), path.join(__dirname, '../src/app/twitter-image.jpg'));
  fs.copyFileSync(path.join(__dirname, '../public/og-image.png'), path.join(__dirname, '../src/app/twitter-image.png'));

  // Also copy to pitch-portugal
  const pitchDir = path.join(__dirname, '../../pitch-portugal');
  if (fs.existsSync(pitchDir)) {
    fs.copyFileSync(path.join(__dirname, '../public/og-image.jpg'), path.join(pitchDir, 'og-image.jpg'));
    fs.copyFileSync(path.join(__dirname, '../public/og-image.png'), path.join(pitchDir, 'og-image.png'));
  }

  console.log('OG Image generated successfully. Size JPG:', fs.statSync(path.join(__dirname, '../public/og-image.jpg')).size, 'bytes, PNG:', fs.statSync(path.join(__dirname, '../public/og-image.png')).size, 'bytes');
}

createOgImage().catch(console.error);
