const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const viewports = [320, 360, 390, 414, 480, 640, 768, 780];
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
const OUT_DIR = path.join(__dirname, '../screenshots/baseline');

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch();

  // Process viewports in parallel batches of 4
  for (let i = 0; i < viewports.length; i += 4) {
    const batch = viewports.slice(i, i + 4);
    await Promise.all(batch.map(async (w) => {
      console.log(`Capturing baseline for width ${w}px...`);
      const context = await browser.newContext({
        viewport: { width: w, height: 900 },
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();

      for (const r of routes) {
        try {
          await page.goto(`${BASE_URL}${r.path}`, { waitUntil: 'load', timeout: 10000 });
          await page.waitForTimeout(150);
          const filePath = path.join(OUT_DIR, `${r.name}_w${w}.png`);
          await page.screenshot({ path: filePath, fullPage: true });
        } catch (err) {
          console.error(`Error capturing ${r.name} at ${w}px:`, err.message);
        }
      }

      // Modal states capture on width 390 (and 780)
      if (w === 390 || w === 780) {
        try {
          await page.goto(`${BASE_URL}/`, { waitUntil: 'load' });
          const cityBtn = page.locator('button:has-text("تهران")').first();
          if (await cityBtn.isVisible()) {
            await cityBtn.click();
            await page.waitForTimeout(200);
            await page.screenshot({ path: path.join(OUT_DIR, `modal-city_w${w}.png`) });
          }
        } catch (e) {
          console.error(`City modal error w${w}:`, e.message);
        }

        try {
          await page.goto(`${BASE_URL}/`, { waitUntil: 'load' });
          const searchTrigger = page.locator('button:has-text("جستجو")').first();
          if (await searchTrigger.isVisible()) {
            await searchTrigger.click();
            await page.waitForTimeout(200);
            await page.screenshot({ path: path.join(OUT_DIR, `modal-search_w${w}.png`) });
          }
        } catch (e) {
          console.error(`Search modal error w${w}:`, e.message);
        }

        try {
          await page.goto(`${BASE_URL}/`, { waitUntil: 'load' });
          const notifTrigger = page.locator('button[aria-label="اعلان‌ها"], button:has-text("اعلان")').first();
          if (await notifTrigger.isVisible()) {
            await notifTrigger.click();
            await page.waitForTimeout(200);
            await page.screenshot({ path: path.join(OUT_DIR, `modal-notification_w${w}.png`) });
          }
        } catch (e) {
          console.error(`Notif modal error w${w}:`, e.message);
        }

        try {
          await page.goto(`${BASE_URL}/gamecenter/gc-1`, { waitUntil: 'load' });
          const reserveBtn = page.locator('button:has-text("رزرو")').first();
          if (await reserveBtn.isVisible()) {
            await reserveBtn.click();
            await page.waitForTimeout(200);
            await page.screenshot({ path: path.join(OUT_DIR, `modal-datetime_w${w}.png`) });
          }
        } catch (e) {
          console.error(`DateTime modal error w${w}:`, e.message);
        }
      }

      await context.close();
    }));
  }

  await browser.close();
  console.log('Baseline screenshots captured successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
