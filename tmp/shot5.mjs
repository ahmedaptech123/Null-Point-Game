import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const errors = [];
async function run(page, tag) {
  page.on('pageerror', e => errors.push(tag + ' ' + e.message));
  page.on('console', m => { if (m.type()==='error') errors.push(tag + ' C ' + m.text()); });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `tmp/${tag}-menu.png` });
  await page.getByRole('button', { name: /Initiate Drop/i }).click({ noWaitAfter: true, force: true });
  await page.waitForTimeout(6500);
  await page.screenshot({ path: `tmp/${tag}-game.png` });
  console.log(tag, 'phase snippet', (await page.locator('body').innerText()).slice(0, 120).replace(/\n/g,' | '));
}
const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await run(desktop, 'd5');
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await run(mobile, 'm5');
console.log('ERRORS', errors);
await browser.close();
