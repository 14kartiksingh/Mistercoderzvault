require('dotenv').config({ path: '../.env', override: true }); // Load root .env
const { PrismaClient } = require('@prisma/client');

async function checkDatabase() {
  const prisma = new PrismaClient();
  try {
    // Attempt a simple connection by issuing a raw query
    await prisma.$queryRaw`SELECT 1`;
    console.log('\n✅ Database Check Passed: Successfully connected to PostgreSQL.');
  } catch (error) {
    console.error('\n❌ Database Check Failed: Could not connect to PostgreSQL.');
    console.error('Error Details:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
