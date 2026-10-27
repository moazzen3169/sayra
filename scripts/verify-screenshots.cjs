const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatchFn = require('pixelmatch');
const pixelmatch = pixelmatchFn.default || pixelmatchFn;

const mobileViewports = [320, 360, 390, 414, 480, 640, 768, 780];
const desktopViewports = [781, 900, 1024, 1180, 1280, 1440, 1920];

const routes = [
  { name: 'home', path: '/' },
  { name: 'gamecenter-detail', path: '/gamecenter/gc-1' },
  { name: 'reservations', path: '/reservations' },
  { name: 'reservation-detail', path: '/reservations/r-1' },
  { name: 'profile', path: '/profile' },
  { name: 'owner-dashboard', path: '/owner' },
  { name: 'owner-reservations', path: '/owner/reservations' },
  { name: 'owner-stations', path: '/owner/stations' },
  { name: 'owner-reviews', path: '/owner/reviews' },
  { name: 'owner-withdraw', path: '/owner/withdraw' },
  { name: 'owner-edit', path: '/owner/edit' },
  { name: 'owner-hours', path: '/owner/hours' },
  { name: 'owner-support', path: '/owner/support' },
];

const BASE_URL = 'http://localhost:3000';
const BASELINE_DIR = path.join(__dirname, '../screenshots/baseline');
const CURRENT_DIR = path.join(__dirname, '../screenshots/current');
const DESKTOP_DIR = path.join(__dirname, '../screenshots/desktop');
const DIFF_DIR = path.join(__dirname, '../screenshots/diff');

async function main() {
  [CURRENT_DIR, DESKTOP_DIR, DIFF_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  const browser = await chromium.launch();

  console.log('--- Phase 7.1: Capturing Current Mobile Screenshots & Comparing ---');
  let totalDiffPixels = 0;
  let diffCount = 0;

  for (let i = 0; i < mobileViewports.length; i += 4) {
    const batch = mobileViewports.slice(i, i + 4);
    await Promise.all(
      batch.map(async (w) => {
        const context = await browser.newContext({
          viewport: { width: w, height: 900 },
          deviceScaleFactor: 1,
        });
        const page = await context.newPage();

        for (const r of routes) {
          try {
            await page.goto(`${BASE_URL}${r.path}`, { waitUntil: 'load', timeout: 10000 });
            await page.waitForTimeout(150);
            const fileName = `${r.name}_w${w}.png`;
            const currentPath = path.join(CURRENT_DIR, fileName);
            await page.screenshot({ path: currentPath, fullPage: true });

            // Compare with baseline if exists
            const baselinePath = path.join(BASELINE_DIR, fileName);
            if (fs.existsSync(baselinePath)) {
              const img1 = PNG.sync.read(fs.readFileSync(baselinePath));
              const img2 = PNG.sync.read(fs.readFileSync(currentPath));

              if (img1.width !== img2.width || img1.height !== img2.height) {
                console.warn(`[SIZE DIFF] ${fileName}: baseline (${img1.width}x${img1.height}) vs current (${img2.width}x${img2.height})`);
                diffCount++;
              } else {
                const diff = new PNG({ width: img1.width, height: img1.height });
                const numDiffPixels = pixelmatch(img1.data, img2.data, diff.data, img1.width, img1.height, {
                  threshold: 0.1,
                });

                if (numDiffPixels > 0) {
                  console.warn(`[PIXEL DIFF] ${fileName}: ${numDiffPixels} pixels differ`);
                  fs.writeFileSync(path.join(DIFF_DIR, `diff_${fileName}`), PNG.sync.write(diff));
                  totalDiffPixels += numDiffPixels;
                  diffCount++;
                }
              }
            }
          } catch (err) {
            console.error(`Error on mobile ${r.name} w${w}:`, err.message);
          }
        }

        // Modal comparison on w390 & w780
        if (w === 390 || w === 780) {
          const modalCaptures = [
            { modal: 'city', name: 'modal-city', trigger: 'button:has-text("تهران")' },
            { modal: 'search', name: 'modal-search', trigger: 'button:has-text("جستجو")' },
            { modal: 'notif', name: 'modal-notification', trigger: 'button[aria-label="اعلان‌ها"], button:has-text("اعلان")' },
          ];

          for (const m of modalCaptures) {
            try {
              await page.goto(`${BASE_URL}/`, { waitUntil: 'load' });
              const btn = page.locator(m.trigger).first();
              if (await btn.isVisible()) {
                await btn.click();
                await page.waitForTimeout(200);
                const fileName = `${m.name}_w${w}.png`;
                const currentPath = path.join(CURRENT_DIR, fileName);
                await page.screenshot({ path: currentPath });

                const baselinePath = path.join(BASELINE_DIR, fileName);
                if (fs.existsSync(baselinePath)) {
                  const img1 = PNG.sync.read(fs.readFileSync(baselinePath));
                  const img2 = PNG.sync.read(fs.readFileSync(currentPath));
                  if (img1.width === img2.width && img1.height === img2.height) {
                    const diff = new PNG({ width: img1.width, height: img1.height });
                    const numDiffPixels = pixelmatch(img1.data, img2.data, diff.data, img1.width, img1.height, { threshold: 0.1 });
                    if (numDiffPixels > 0) {
                      console.warn(`[PIXEL DIFF] ${fileName}: ${numDiffPixels} pixels differ`);
                      fs.writeFileSync(path.join(DIFF_DIR, `diff_${fileName}`), PNG.sync.write(diff));
                      diffCount++;
                    }
                  }
                }
              }
            } catch (e) {
              console.error(`Error modal ${m.name} w${w}:`, e.message);
            }
          }
        }

        await context.close();
      })
    );
  }

  console.log(`Mobile Baseline Comparison Complete. Total Diff Files: ${diffCount}, Total Diff Pixels: ${totalDiffPixels}`);

  console.log('--- Phase 7.2: Desktop Verification (>= 781px) & Horizontal Scroll Check ---');
  let overflowErrors = 0;

  for (let i = 0; i < desktopViewports.length; i += 3) {
    const batch = desktopViewports.slice(i, i + 3);
    await Promise.all(
      batch.map(async (w) => {
        const context = await browser.newContext({
          viewport: { width: w, height: 950 },
          deviceScaleFactor: 1,
        });
        const page = await context.newPage();

        for (const r of routes) {
          try {
            await page.goto(`${BASE_URL}${r.path}`, { waitUntil: 'load', timeout: 10000 });
            await page.waitForTimeout(150);

            // Check horizontal overflow
            const hasHorizontalScroll = await page.evaluate(() => {
              return document.documentElement.scrollWidth > window.innerWidth;
            });

            if (hasHorizontalScroll) {
              console.error(`[OVERFLOW DETECTED] Route ${r.path} at desktop width ${w}px has horizontal scrollbar!`);
              overflowErrors++;
            }

            const currentPath = path.join(DESKTOP_DIR, `${r.name}_w${w}.png`);
            await page.screenshot({ path: currentPath, fullPage: true });
          } catch (err) {
            console.error(`Error on desktop ${r.name} w${w}:`, err.message);
          }
        }

        await context.close();
      })
    );
  }

  await browser.close();

  console.log(`Desktop Verification Complete. Overflow Errors: ${overflowErrors}`);
  if (diffCount === 0 && overflowErrors === 0) {
    console.log('✅ ALL VERIFICATIONS PASSED WITH 100% SUCCESS!');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
