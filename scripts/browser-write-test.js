/**
 * Real WRITE-operation test (Playwright + DB confirmation).
 * Drives actual forms/endpoints as a logged-in user, then CONFIRMS each row in DB:
 *   1) Teacher records a payment (UI form  -> recordPayment server action)
 *   2) Teacher marks attendance PRESENT    (authenticated REST API)
 *   3) Student takes & submits an exam     (UI -> submitExamAction server action)
 *
 * Prereqs:  npm run db:seed-test  (creates accounts + today's session + an exam)
 *           npm run dev           (server on :3000)
 *           npx playwright install chromium
 * Run:      node scripts/browser-write-test.js   (or npm run test:browser-write)
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require(path.join(__dirname, '..', 'src', 'generated', 'client'));

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const SHOTS = path.join(__dirname, '..', 'scratch', 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const prisma = new PrismaClient();
const results = [];
const log = (n, ok, d) => { results.push({ n, ok }); console.log(`${ok ? '✅' : '❌'} ${n}${d ? '  — ' + d : ''}`); };
const shot = (p, f) => p.screenshot({ path: path.join(SHOTS, f), fullPage: true }).catch(() => {});

async function login(browser, phone, expect) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/test-center/login`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.fill('#phone', phone);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForSelector('#phone', { state: 'detached', timeout: 20000 });
  await page.waitForTimeout(400);
  await page.keyboard.type('1234', { delay: 80 });
  await page.waitForTimeout(200);
  await page.keyboard.press('Enter');
  await page.waitForURL((u) => expect.test(new URL(u).pathname), { timeout: 25000 });
  await page.waitForTimeout(500);
  return { ctx, page };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug: 'test-center' }, select: { id: true } });
    if (!tenant) throw new Error('Run `npm run db:seed-test` first.');
    const student = await prisma.user.findFirst({ where: { tenantId: tenant.id, phone: '01000000002' }, select: { id: true } });
    const group = await prisma.group.findFirst({ where: { tenantId: tenant.id, name: 'مجموعة تجريبية' }, select: { id: true } });
    const session = await prisma.session.findFirst({ where: { groupId: group.id }, orderBy: { date: 'desc' }, select: { id: true } });
    const exam = await prisma.exam.findFirst({ where: { tenantId: tenant.id, title: 'امتحان تجريبي' }, select: { id: true } });
    const month = new Date().toISOString().slice(0, 7);
    await prisma.examSubmission.deleteMany({ where: { examId: exam.id, studentId: student.id } }); // repeatable

    // 1) TEACHER records a payment via the UI form
    const t = await login(browser, '01000000001', /^\/teacher/);
    try {
      const before = await prisma.payment.count({ where: { tenantId: tenant.id, studentId: student.id, month, status: 'PAID' } });
      await t.page.goto(`${BASE}/payments/record`, { waitUntil: 'networkidle', timeout: 45000 });
      await t.page.selectOption('#studentId', student.id);
      await t.page.fill('#totalAmount', '300');
      await t.page.getByRole('button', { name: /تسجيل الدفعة/ }).click();
      await t.page.waitForTimeout(3500);
      await shot(t.page, 'write-payment.png');
      const pay = await prisma.payment.findFirst({ where: { tenantId: tenant.id, studentId: student.id, month, status: 'PAID' }, orderBy: { createdAt: 'desc' }, select: { amount: true, receiptNumber: true } });
      const after = await prisma.payment.count({ where: { tenantId: tenant.id, studentId: student.id, month, status: 'PAID' } });
      log('PAYMENT (UI form -> DB)', after > before && pay?.amount === 300, pay ? `amount=${pay.amount} receipt=${pay.receiptNumber}` : 'no PAID row');
    } catch (e) { await shot(t.page, 'write-payment-ERROR.png'); log('PAYMENT', false, e.message.split('\n')[0]); }

    // 2) TEACHER marks attendance via authenticated REST API
    try {
      const api = t.page.request;
      await api.post(`${BASE}/api/attendance/sessions/${session.id}/start`, { data: {} });
      const r = await api.post(`${BASE}/api/attendance/sessions/${session.id}/mark`, { data: { studentId: student.id, status: 'PRESENT' } });
      const att = await prisma.attendance.findFirst({ where: { sessionId: session.id, studentId: student.id }, select: { status: true } });
      log('ATTENDANCE (API -> DB)', r.ok() && att?.status === 'PRESENT', `httpStatus=${r.status()} dbStatus=${att?.status}`);
    } catch (e) { log('ATTENDANCE', false, e.message.split('\n')[0]); }
    await t.ctx.close();

    // 3) STUDENT takes & submits the exam via the UI
    const s = await login(browser, '01000000002', /^\/student/);
    try {
      await s.page.goto(`${BASE}/student/exams/${exam.id}`, { waitUntil: 'networkidle', timeout: 45000 });
      await s.page.waitForTimeout(800);
      await s.page.getByRole('button', { name: '٤', exact: true }).first().click();
      await s.page.getByRole('button', { name: /التالي/ }).click();
      await s.page.waitForTimeout(400);
      await s.page.getByRole('button', { name: 'القاهرة', exact: true }).first().click();
      await s.page.getByRole('button', { name: /تسليم الاختبار/ }).click();
      await s.page.getByRole('button', { name: /نعم، متأكد/ }).click();
      await s.page.waitForTimeout(3500);
      await shot(s.page, 'write-exam.png');
      const sub = await prisma.examSubmission.findFirst({ where: { examId: exam.id, studentId: student.id }, select: { totalGrade: true } });
      log('EXAM SUBMISSION (UI -> DB)', !!sub, sub ? `auto-grade=${sub.totalGrade}/20` : 'no submission row');
    } catch (e) { await shot(s.page, 'write-exam-ERROR.png'); log('EXAM SUBMISSION', false, e.message.split('\n')[0]); }
    await s.ctx.close();

    const pass = results.filter((r) => r.ok).length;
    console.log(`\n=== ${pass}/${results.length} write-operations confirmed in DB ===`);
    if (pass !== results.length) process.exitCode = 1;
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
})();
