const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: "postgresql://postgres:VaultPassword123!@localhost:5432/postgres" } }
});
async function run() {
  try {
    await prisma.$queryRawUnsafe(`SELECT 1`);
    console.log('FINAL_TEST_SUCCESS');
  } catch (e) {
    console.error('FINAL_TEST_FAILED:', e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
