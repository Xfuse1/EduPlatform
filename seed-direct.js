const { PrismaClient } = require('./src/generated/client');

const prisma = new PrismaClient();

async function seedPlans() {
  try {
    console.log('Starting to seed subscription plans...');
    
    // STARTER Plan
    const starter = await prisma.subscriptionPlanConfig.upsert({
      where: { key: 'STARTER' },
      update: {
        name: 'البداية',
        monthlyPrice: 200,
        yearlyPrice: 2000,
        studentsLimit: 20,
        groupsLimit: 2,
        sessionsLimit: 100,
        storageLimit: 100,
        isActive: true,
        deletedAt: null,
      },
      create: {
        key: 'STARTER',
        plan: 'STARTER',
        name: 'البداية',
        monthlyPrice: 200,
        yearlyPrice: 2000,
        studentsLimit: 20,
        groupsLimit: 2,
        sessionsLimit: 100,
        storageLimit: 100,
        isActive: true,
      },
    });
    console.log('✓ STARTER plan seeded:', starter.key);

    // PROFESSIONAL Plan
    const professional = await prisma.subscriptionPlanConfig.upsert({
      where: { key: 'PROFESSIONAL' },
      update: {
        name: 'الاحترافية',
        monthlyPrice: 500,
        yearlyPrice: 5000,
        studentsLimit: 100,
        groupsLimit: 10,
        sessionsLimit: 1000,
        storageLimit: 1000,
        isActive: true,
        deletedAt: null,
      },
      create: {
        key: 'PROFESSIONAL',
        plan: 'PROFESSIONAL',
        name: 'الاحترافية',
        monthlyPrice: 500,
        yearlyPrice: 5000,
        studentsLimit: 100,
        groupsLimit: 10,
        sessionsLimit: 1000,
        storageLimit: 1000,
        isActive: true,
      },
    });
    console.log('✓ PROFESSIONAL plan seeded:', professional.key);

    // ENTERPRISE Plan
    const enterprise = await prisma.subscriptionPlanConfig.upsert({
      where: { key: 'ENTERPRISE' },
      update: {
        name: 'المؤسسات',
        monthlyPrice: 0,
        yearlyPrice: 0,
        studentsLimit: 9999,
        groupsLimit: 9999,
        sessionsLimit: 9999,
        storageLimit: 9999,
        isActive: true,
        deletedAt: null,
      },
      create: {
        key: 'ENTERPRISE',
        plan: 'ENTERPRISE',
        name: 'المؤسسات',
        monthlyPrice: 0,
        yearlyPrice: 0,
        studentsLimit: 9999,
        groupsLimit: 9999,
        sessionsLimit: 9999,
        storageLimit: 9999,
        isActive: true,
      },
    });
    console.log('✓ ENTERPRISE plan seeded:', enterprise.key);

    console.log('\n✅ All subscription plans seeded successfully!');
    console.log('The admin/plans page should now work without errors.');
  } catch (error) {
    console.error('❌ Error seeding plans:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedPlans();
