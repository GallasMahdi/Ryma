import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9225;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getWsUrl() {
  for (let i = 0; i < 25; i++) {
    try {
      const list = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${PORT}/json/list`, resp => {
          let data = '';
          resp.on('data', chunk => data += chunk);
          resp.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
      });
      const page = list.find(t => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch (e) {
      await sleep(300);
    }
  }
  throw new Error('Chrome did not respond on debug port');
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    const { WebSocket } = await import('ws').catch(() => {
      // If ws is not installed globally, fallback to native if node 21+ or basic
      return { WebSocket: globalThis.WebSocket };
    });

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = reject;
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { res, rej } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) rej(msg.error);
          else res(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((res, rej) => {
      const id = this.id++;
      this.callbacks.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function run() {
  const tempProfile = path.join(process.cwd(), '.chrome-temp-' + Date.now());
  fs.mkdirSync(tempProfile, { recursive: true });

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tempProfile}`,
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    '--disable-background-networking'
  ]);

  try {
    const wsUrl = await getWsUrl();
    const cdp = new CDPClient(wsUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('DOM.enable');
    await cdp.send('Runtime.enable');

    // 1. Desktop Viewport
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    });

    const fileUrl = 'file:///' + path.resolve('index.html').replace(/\\/g, '/');
    console.log('Navigating to:', fileUrl);
    await cdp.send('Page.navigate', { url: fileUrl });
    await sleep(1500);

    const desktopDiag = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const winW = window.innerWidth;
        const nav = document.getElementById('navbar');
        const navInner = document.querySelector('.nav-inner');
        const btnDemo = document.querySelector('.btn-nav-demo');
        const btnRoi = document.querySelector('.btn-nav-roi');
        const dr = btnDemo ? btnDemo.getBoundingClientRect() : null;
        const rr = btnRoi ? btnRoi.getBoundingClientRect() : null;
        const nr = navInner.getBoundingClientRect();
        return {
          winW,
          navInner: { left: nr.left, right: nr.right, width: nr.width },
          btnDemo: dr ? { left: dr.left, right: dr.right, width: dr.width } : null,
          btnRoi: rr ? { left: rr.left, right: rr.right, width: rr.width } : null,
        };
      })()`,
      returnByValue: true
    });
    console.log('Desktop Navbar Diagnostics:', desktopDiag.result.value);

    const desktopShot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('verify-navbar-desktop.png', Buffer.from(desktopShot.data, 'base64'));
    console.log('Saved verify-navbar-desktop.png');

    // Scroll to #screenshots
    await cdp.send('Runtime.evaluate', {
      expression: `document.getElementById('screenshots').scrollIntoView()`
    });
    await sleep(600);

    const heroShowroomShot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('verify-showroom-hero.png', Buffer.from(heroShowroomShot.data, 'base64'));
    console.log('Saved verify-showroom-hero.png');

    // Test Patient Experience image replacement and Click to Enlarge
    await cdp.send('Runtime.evaluate', {
      expression: `document.getElementById('avaliacoes').scrollIntoView()`
    });
    await sleep(600);

    const testZoomResult = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const img = document.querySelector('.reviews-card img[src*="client-care-map"]');
        if (!img) return { found: false };
        img.click();
        const lb = document.getElementById('image-lightbox');
        const lbImg = document.getElementById('lightbox-img');
        return {
          found: true,
          imgSrc: img.src,
          lightboxActive: lb.classList.contains('active'),
          lbImgSrc: lbImg.src
        };
      })()`,
      returnByValue: true
    });
    console.log('Image Click Zoom Test Result:', testZoomResult.result.value);
    await sleep(400);

    const zoomShot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('verify-enlarged.png', Buffer.from(zoomShot.data, 'base64'));
    console.log('Saved verify-enlarged.png');

    // 2a. Tablet Viewport (768px)
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 768,
      height: 1024,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(400);

    const tabletDiag = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const winW = window.innerWidth;
        const nav = document.getElementById('navbar');
        const hamburger = document.getElementById('nav-hamburger-btn');
        const hr = hamburger.getBoundingClientRect();
        return {
          winW,
          hamburger: { left: hr.left, right: hr.right, width: hr.width },
          hasOverflow: document.documentElement.scrollWidth > winW
        };
      })()`,
      returnByValue: true
    });
    console.log('Tablet (768px) Diagnostics:', tabletDiag.result.value);

    // 2b. Small Mobile Viewport (360px)
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 360,
      height: 740,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(400);

    const smallMobileDiag = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const winW = window.innerWidth;
        const hamburger = document.getElementById('nav-hamburger-btn');
        const hr = hamburger.getBoundingClientRect();
        return {
          winW,
          hamburger: { left: hr.left, right: hr.right, width: hr.width },
          hasOverflow: document.documentElement.scrollWidth > winW
        };
      })()`,
      returnByValue: true
    });
    console.log('Small Mobile (360px) Diagnostics:', smallMobileDiag.result.value);

    // 2c. Mobile Viewport (iPhone 14 size)
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(400);

    const mobileDiag = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const winW = window.innerWidth;
        const nav = document.getElementById('navbar');
        const navInner = document.querySelector('.nav-inner');
        const hamburger = document.getElementById('nav-hamburger-btn');
        const btnDemo = document.querySelector('.btn-nav-demo');
        const hr = hamburger.getBoundingClientRect();
        const nr = navInner.getBoundingClientRect();
        return {
          winW,
          navInner: { left: nr.left, right: nr.right, width: nr.width },
          hamburger: { left: hr.left, right: hr.right, width: hr.width },
          btnDemoDisplay: btnDemo ? window.getComputedStyle(btnDemo).display : 'none',
          navOffsetWidth: nav.offsetWidth
        };
      })()`,
      returnByValue: true
    });
    console.log('Mobile Navbar Diagnostics:', mobileDiag.result.value);

    const mobileShot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('verify-navbar-mobile.png', Buffer.from(mobileShot.data, 'base64'));
    console.log('Saved verify-navbar-mobile.png');

    // 3. Open Mobile Drawer
    const drawerOpenResult = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        openMobileDrawer();
        const drawer = document.getElementById('mobile-drawer');
        const sheets = Array.from(document.styleSheets);
        const drawerRules = [];
        sheets.forEach(s => {
          try {
            Array.from(s.cssRules).forEach(r => {
              if (r.selectorText && r.selectorText.includes('mobile-drawer')) {
                drawerRules.push({ sel: r.selectorText, css: r.cssText });
              }
            });
          } catch(e) {}
        });
        return {
          isOpen: drawer.classList.contains('open'),
          classes: drawer.className,
          display: window.getComputedStyle(drawer).display,
          opacity: window.getComputedStyle(drawer).opacity,
          visibility: window.getComputedStyle(drawer).visibility,
          rules: drawerRules
        };
      })()`,
      returnByValue: true
    });
    console.log('Mobile Drawer Diagnostics:', JSON.stringify(drawerOpenResult.result.value, null, 2));
    await sleep(400);

    const drawerShot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('verify-navbar-drawer.png', Buffer.from(drawerShot.data, 'base64'));
    console.log('Saved verify-navbar-drawer.png');
    fs.writeFileSync('verify-navbar-drawer.png', Buffer.from(drawerShot.data, 'base64'));
    console.log('Saved verify-navbar-drawer.png');

    console.log('All navbar screenshots captured successfully!');
  } finally {
    chromeProc.kill();
    try {
      fs.rmSync(tempProfile, { recursive: true, force: true });
    } catch (_) {}
  }
}

run().catch(err => {
  console.error('Error running verification:', err);
  process.exit(1);
});
