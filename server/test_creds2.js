const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: "postgresql://postgres@localhost:5432/postgres" } }
});
async function run() {
  try {
    await prisma.$queryRawUnsafe(`SELECT 1`);
    console.log('SUCCESS');
  } catch (e) {
    console.error('FAILED');
  } finally {
    await prisma.$disconnect();
  }
}
run();
