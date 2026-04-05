const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany();
  console.log('Tenants:', tenants.map(t => ({ id: t.id, name: t.name, slug: t.slug })));
  
  const groups = await prisma.group.findMany();
  console.log('Groups:', groups.map(g => ({ id: g.id, name: g.name, tenantId: g.tenantId, isActive: g.isActive })));
  
  const students = await prisma.user.findMany({ where: { role: 'STUDENT' } });
  console.log('Students:', students.length);
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
