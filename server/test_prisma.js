const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '../.env' });
const prisma = new PrismaClient();

async function test() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { assets: { where: { isDeleted: false } } }
        }
      }
    });
    console.log('Categories fetch successful:', categories.length);
    
    const assets = await prisma.asset.findMany({
      where: { isDeleted: false },
      include: { category: true, tags: true }
    });
    console.log('Assets fetch successful:', assets.length);
  } catch(e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}
test();
