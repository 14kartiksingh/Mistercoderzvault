const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '../.env' });
const prisma = new PrismaClient();

async function main() {
  try {
    const assets = await prisma.asset.findMany({
      where: { isDeleted: false },
      include: { files: true, category: true }
    });

    console.log(`\nFound ${assets.length} Active Assets:`);
    assets.forEach(a => {
      console.log(`\nAsset ID: ${a.id}`);
      console.log(`Name: ${a.name}`);
      console.log(`Type: ${a.uploadType}`);
      console.log(`Category: ${a.category?.name}`);
      console.log(`Files count: ${a.files.length}`);
      a.files.forEach(f => {
        console.log(` - File ID: ${f.id}`);
        console.log(`   FileName: ${f.fileName}`);
        console.log(`   FileSize: ${f.fileSize.toString()} bytes`);
        console.log(`   TelegramMsgId: ${f.telegramMessageId}`);
      });
    });
  } catch (error) {
    console.error('Error listing assets:', error);
  } finally {
    await prisma.$disconnect();
  }
}
main();
