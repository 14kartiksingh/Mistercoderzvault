const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: "postgresql://postgres@localhost:5432/postgres" } }
});
async function run() {
  try {
    await prisma.$executeRawUnsafe(`ALTER USER postgres WITH PASSWORD 'VaultPassword123!';`);
    console.log('PASSWORD_RESET_SUCCESS');
  } catch (e) {
    console.error('FAILED:', e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
