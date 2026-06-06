/**
 * Seed a full TEST environment for local PIN-login testing (no OTP/SMS needed).
 *
 * Creates (idempotent — safe to re-run):
 *   - tenant  "سنتر تجريبي"  (slug: test-center)
 *   - CENTER_ADMIN  01000000000  PIN 1234   -> /center
 *   - TEACHER       01000000001  PIN 1234   -> /teacher
 *   - STUDENT       01000000002  PIN 1234   -> /student   (wallet 500 EGP)
 *   - PARENT        01000000003  PIN 1234   -> /parent
 *   - one group "مجموعة تجريبية" (owned by the teacher), student enrolled (ACTIVE),
 *     parent linked to the student.
 *
 * Run:  node scripts/seed-test-account.js     (or: npm run db:seed-test)
 * Login: open http://localhost:3000/test-center/login  (or the apex /login),
 *        enter the phone, then the PIN 1234.
 *
 * ⚠️ Creates test data in whatever DATABASE_URL points to. Use a DEV database.
 * Remove later with:  node scripts/seed-test-account.js --remove
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { PrismaClient } = require(path.join(__dirname, '..', 'src', 'generated', 'client'));

const prisma = new PrismaClient();

const SLUG = 'test-center';
const PIN = '1234';
const PEOPLE = [
  { phone: '01000000000', name: 'مدير السنتر التجريبي', role: 'CENTER_ADMIN' },
  { phone: '01000000001', name: 'مدرّس تجريبي', role: 'TEACHER' },
  { phone: '01000000002', name: 'طالب تجريبي', role: 'STUDENT', gradeLevel: 'الصف الأول الثانوي', parentPhone: '01000000003', parentName: 'ولي أمر تجريبي' },
  { phone: '01000000003', name: 'ولي أمر تجريبي', role: 'PARENT' },
];

async function remove() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: SLUG }, select: { id: true } });
  if (!tenant) { console.log('Nothing to remove (no test-center tenant).'); return; }
  // Cascades remove users, groups, enrollments, wallets, sessions, etc.
  await prisma.tenant.delete({ where: { id: tenant.id } });
  console.log('Removed test tenant + all its data.');
}

async function seed() {
  const pinHash = await bcrypt.hash(PIN, 10);

  const tenant = await prisma.tenant.upsert({
    where: { slug: SLUG },
    update: {},
    create: {
      slug: SLUG,
      name: 'سنتر تجريبي',
      plan: 'PRO',
      themeColor: '#2E86C1',
      smsQuota: 100,
      isActive: true,
      subjects: ['رياضيات'],
      region: 'القاهرة',
      bio: 'حساب تجريبي لاختبار النظام',
    },
    select: { id: true },
  });

  const users = {};
  for (const p of PEOPLE) {
    const u = await prisma.user.upsert({
      where: { tenantId_phone: { tenantId: tenant.id, phone: p.phone } },
      update: { pinHash, isActive: true, name: p.name, role: p.role },
      create: {
        tenantId: tenant.id,
        phone: p.phone,
        name: p.name,
        role: p.role,
        isActive: true,
        pinHash,
        gradeLevel: p.gradeLevel ?? null,
        parentName: p.parentName ?? null,
        parentPhone: p.parentPhone ?? null,
      },
      select: { id: true, role: true },
    });
    users[p.role] = u;
  }

  // Group owned by the teacher
  let group = await prisma.group.findFirst({
    where: { tenantId: tenant.id, name: 'مجموعة تجريبية' },
    select: { id: true },
  });
  if (!group) {
    group = await prisma.group.create({
      data: {
        tenantId: tenant.id,
        name: 'مجموعة تجريبية',
        subject: 'رياضيات',
        gradeLevel: 'الصف الأول الثانوي',
        days: ['السبت', 'الثلاثاء'],
        timeStart: '16:00',
        timeEnd: '18:00',
        monthlyFee: 300,
        billingType: 'MONTHLY',
        maxCapacity: 30,
        teacherId: users.TEACHER.id,
        color: '#2E86C1',
        schedule: [
          { day: 'السبت', timeStart: '16:00', timeEnd: '18:00' },
          { day: 'الثلاثاء', timeStart: '16:00', timeEnd: '18:00' },
        ],
      },
      select: { id: true },
    });
  }

  // Enroll student (ACTIVE) + link parent
  await prisma.groupStudent.upsert({
    where: { groupId_studentId: { groupId: group.id, studentId: users.STUDENT.id } },
    update: { status: 'ACTIVE' },
    create: { groupId: group.id, studentId: users.STUDENT.id, status: 'ACTIVE' },
  });
  await prisma.parentStudent.upsert({
    where: { parentId_studentId: { parentId: users.PARENT.id, studentId: users.STUDENT.id } },
    update: {},
    create: { parentId: users.PARENT.id, studentId: users.STUDENT.id, relationship: 'parent' },
  });

  // Give the student a wallet balance so payment screens have data
  await prisma.userWallet.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: users.STUDENT.id } },
    update: {},
    create: { tenantId: tenant.id, userId: users.STUDENT.id, balance: 500 },
  });

  console.log('✅ Test environment ready (tenant slug: ' + SLUG + ', PIN for all: ' + PIN + ')');
  console.log('   Login at  http://localhost:3000/' + SLUG + '/login   (or apex /login)');
  console.table(PEOPLE.map((p) => ({ phone: p.phone, role: p.role, PIN, name: p.name })));
}

(async () => {
  try {
    if (process.argv.includes('--remove')) {
      await remove();
    } else {
      await seed();
    }
  } catch (e) {
    console.error('SEED FAILED:', e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
