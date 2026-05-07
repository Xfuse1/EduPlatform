const { PrismaClient } = require('../src/generated/client');

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { name: { contains: 'نهى' } },
    select: { id: true, name: true, tenantId: true }
  });
  
  if (!user) {
    console.error("Student 'Noha' not found.");
    return;
  }

  console.log("Found Student:", user.name, user.id);

  const admin = await prisma.user.findFirst({
    where: { tenantId: user.tenantId, role: { in: ['CENTER_ADMIN', 'TEACHER', 'ADMIN', 'MANAGER'] } },
    select: { id: true }
  });

  const amount = 500;

  const wallet = await prisma.userWallet.upsert({
    where: { tenantId_userId: { tenantId: user.tenantId, userId: user.id } },
    update: { balance: { increment: amount } },
    create: { tenantId: user.tenantId, userId: user.id, balance: amount }
  });

  await prisma.walletTransaction.create({
    data: {
      tenantId: user.tenantId,
      walletId: wallet.id,
      userId: user.id,
      type: 'CREDIT',
      amount: amount,
      reason: 'شحن رصيد يدوي لتغطية الحصة',
      createdById: admin ? admin.id : null,
      status: 'COMPLETED'
    }
  });

  console.log(`Successfully recharged ${amount} EGP for ${user.name}.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
