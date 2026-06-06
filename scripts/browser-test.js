/**
 * Real browser smoke test via Playwright (Chromium) against a running dev server.
 *
 * Prereqs:
 *   1) npm run db:seed-test        (creates the test-center accounts, PIN 1234)
 *   2) npm run dev                 (server on http://localhost:3000)
 *   3) npx playwright install chromium   (one-time browser download)
 * Run:  node scripts/browser-test.js
 *
 * Tests public pages + full PIN login for TEACHER/CENTER_ADMIN/STUDENT/PARENT,
 * then navigates role dashboards. Screenshots are written to scratch/shots/
 * (gitignored). Exits non-zero if any check fails.
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const SHOTS = path.join(__dirname, '..', 'scratch', 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
function log(name, ok, detail) {
  results.push({ name, ok });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? '  — ' + detail : ''}`);
}
const shot = (page, file) => page.screenshot({ path: path.join(SHOTS, file), fullPage: true }).catch(() => {});

async function publicPage(browser, url, file, expectText) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const resp = await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => null);
  await page.waitForTimeout(400);
  const bodyText = (await page.locator('body').innerText().catch(() => '')) || '';
  const hasText = expectText ? bodyText.includes(expectText) : true;
  await shot(page, file);
  log(`public ${url}`, resp?.ok() !== false && hasText && errors.length === 0,
    `status=${resp?.status()}${expectText ? ` hasText=${hasText}` : ''}${errors.length ? ` JSERR=${errors[0]}` : ''}`);
  await ctx.close();
}

async function loginByPin(browser, { phone, pin, slug, role, expect }) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto(`${BASE}/${slug}/login`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.fill('#phone', phone);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForSelector('#phone', { state: 'detached', timeout: 20000 });
    await page.waitForTimeout(500);
    await shot(page, `login-${role}-pinpad.png`);
    await page.keyboard.type(pin, { delay: 90 });
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForURL((u) => expect.test(new URL(u).pathname), { timeout: 25000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(600);
    const finalPath = new URL(page.url()).pathname;
    await shot(page, `login-${role}-dashboard.png`);
    log(`LOGIN ${role} (${phone})`, expect.test(finalPath) && errors.length === 0,
      `landed=${finalPath}${errors.length ? ` JSERR=${errors[0]}` : ''}`);
    return { ctx, page, ok: expect.test(finalPath) };
  } catch (e) {
    await shot(page, `login-${role}-ERROR.png`);
    log(`LOGIN ${role} (${phone})`, false, `at=${new URL(page.url()).pathname} ${e.message.split('\n')[0]}`);
    return { ctx, page, ok: false };
  }
}

async function visit(page, role, url) {
  try {
    const resp = await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(300);
    await shot(page, `${role}${url.replace(/\//g, '_')}.png`);
    log(`  ${role} visits ${url}`, resp?.ok() !== false, `status=${resp?.status()}`);
  } catch (e) {
    log(`  ${role} visits ${url}`, false, e.message.split('\n')[0]);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    console.log('=== PUBLIC PAGES ===');
    await publicPage(browser, '/', 'public-home.png', 'EduPlatform');
    await publicPage(browser, '/login', 'public-login.png', 'رقم الهاتف');
    await publicPage(browser, '/pricing', 'public-pricing.png');
    await publicPage(browser, '/test-center', 'public-tenant.png');
    await publicPage(browser, '/test-center/login', 'public-tenant-login.png', 'رقم الهاتف');

    console.log('\n=== PIN LOGIN (seeded test-center accounts) ===');
    const teacher = await loginByPin(browser, { phone: '01000000001', pin: '1234', slug: 'test-center', role: 'TEACHER', expect: /^\/teacher/ });
    if (teacher.ok) {
      await visit(teacher.page, 'teacher', '/teacher/groups');
      await visit(teacher.page, 'teacher', '/teacher/students');
      await visit(teacher.page, 'teacher', '/payments');
      await visit(teacher.page, 'teacher', '/attendance');
      await visit(teacher.page, 'teacher', '/messages');
    }
    await teacher.ctx.close();

    const center = await loginByPin(browser, { phone: '01000000000', pin: '1234', slug: 'test-center', role: 'CENTER_ADMIN', expect: /^\/center/ });
    await center.ctx.close();

    const student = await loginByPin(browser, { phone: '01000000002', pin: '1234', slug: 'test-center', role: 'STUDENT', expect: /^\/student/ });
    if (student.ok) {
      await visit(student.page, 'student', '/student/exams');
      await visit(student.page, 'student', '/student/assignments');
    }
    await student.ctx.close();

    const parent = await loginByPin(browser, { phone: '01000000003', pin: '1234', slug: 'test-center', role: 'PARENT', expect: /^\/parent/ });
    await parent.ctx.close();

    const pass = results.filter((r) => r.ok).length;
    console.log(`\n=== ${pass}/${results.length} checks passed ===  (screenshots: scratch/shots/)`);
    if (pass !== results.length) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
