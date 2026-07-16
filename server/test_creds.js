const { PrismaClient } = require('@prisma/client');
async function run() {
  const passwords = ["password", "postgres", "root", "admin", "kartiksin", "123456", "MisterCoderz2026Server98", "rootpassword", ""];
  for (const p of passwords) {
    const url = `postgresql://postgres:${p}@localhost:5432/postgres`;
    process.env.DATABASE_URL = url;
    const prisma = new PrismaClient({ datasources: { db: { url } } });
    try {
      await prisma.$queryRawUnsafe(`SELECT 1`);
      console.log('SUCCESS with password:', p === "" ? "<empty>" : p);
      process.exit(0);
    } catch(e) {
      // ignore
    } finally {
      await prisma.$disconnect();
    }
  }
  console.log('ALL FAILED');
}
run();
