const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '../.env' });
const prisma = new PrismaClient();

async function main() {
  try {
    const largeFiles = await prisma.assetFile.findMany({
      where: {
        telegramMessageId: { not: null },
        fileSize: { gte: BigInt(10 * 1024 * 1024) } // >= 10MB
      },
      include: { asset: true }
    });

    console.log(`Found ${largeFiles.length} uploaded large files:`);
    largeFiles.forEach(f => {
      console.log(`- File: ${f.fileName}`);
      console.log(`  Size: ${f.fileSize.toString()} bytes (~${(Number(f.fileSize) / (1024 * 1024)).toFixed(2)} MB)`);
      console.log(`  Msg ID: ${f.telegramMessageId}`);
      console.log(`  Asset ID: ${f.assetId} (${f.asset.name})`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
main();
