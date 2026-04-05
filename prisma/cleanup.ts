import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning up users with phone 01000000000...");
  await prisma.user.deleteMany({
    where: {
      phone: "01000000000",
    },
  });
  console.log("Cleanup complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
