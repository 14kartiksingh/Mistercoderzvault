require('dotenv').config({ path: require('path').join(__dirname, '../../.env'), override: true });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const category = await prisma.category.findFirst() || await prisma.category.create({
    data: { name: 'Test Category', slug: 'test-category' }
  });

  const asset = await prisma.asset.create({
    data: {
      name: 'Test Multipart Asset',
      categoryId: category.id,
      uploadType: 'MULTIPART',
      contentType: 'multipart/mixed',
      sizeBytes: 10000n,
      isPending: false,
      files: {
        create: [
          {
            fileName: 'part1.rar',
            fileSize: 5000n,
            partNumber: 1,
            // Use dummy telegram ids
            telegramFileId: 'dummy-file-id-1',
            telegramMessageId: 1
          },
          {
            fileName: 'part2.rar',
            fileSize: 5000n,
            partNumber: 2,
            telegramFileId: 'dummy-file-id-2',
            telegramMessageId: 2
          }
        ]
      }
    }
  });

  console.log(`Created asset: ${asset.id}`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
