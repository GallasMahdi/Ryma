import fs from 'fs';
import path from 'path';

const logoPath = path.resolve('public/logo-mark.png');
const b64Gold = fs.readFileSync(logoPath).toString('base64');

const svgContent = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="badgeBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#221A17" />
      <stop offset="100%" stop-color="#120E0C" />
    </linearGradient>
    <linearGradient id="goldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F5E9C8" />
      <stop offset="40%" stop-color="#C49A3C" />
      <stop offset="100%" stop-color="#8A6A24" />
    </linearGradient>
  </defs>
  <rect x="20" y="20" width="472" height="472" rx="108" fill="url(#badgeBg)" stroke="url(#goldBorder)" stroke-width="16" />
  <image x="64" y="64" width="384" height="384" href="data:image/png;base64,${b64Gold}" />
</svg>
`;

fs.writeFileSync('public/icon.svg', svgContent, 'utf-8');
fs.writeFileSync('public/favicon.svg', svgContent, 'utf-8');
console.log('Successfully generated public/icon.svg and public/favicon.svg with gold emblem');
