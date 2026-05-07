import { PrismaClient } from '../src/generated/client';

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

  console.log("Found Student:", user);

  // Get the tenant payee to log who is recharging (simulating admin)
  const admin = await prisma.user.findFirst({
    where: { tenantId: user.tenantId, role: { in: ['CENTER_ADMIN', 'TEACHER', 'ADMIN', 'MANAGER'] } },
    select: { id: true }
  });

  const amount = 500; // Recharge 500 EGP to be safe

  // We need to use the wallet provider functions if possible, but for simplicity we can do it directly
  // or use the provider.
  // Let's do it directly since we are in a script.

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
      reason: 'شحن رصيد يدوي من الأدمن لتغطية الحصة',
      createdById: admin?.id ?? null,
    }
  });

  console.log(`Successfully recharged ${amount} EGP for ${user.name}. New balance: ${wallet.balance}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
