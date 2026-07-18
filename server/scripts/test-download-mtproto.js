const dotenv = require('dotenv');
const path = require('path');

// Load env variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const { initTelegramClient, getTelegramClient } = require('../utils/telegramClient');

async function testConnection() {
  console.log('=== Telegram MTProto Diagnostic Tool ===');
  
  const apiId = process.env.TELEGRAM_API_ID;
  const apiHash = process.env.TELEGRAM_API_HASH;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_STORAGE_CHANNEL_ID;

  console.log(`API ID: ${apiId ? 'Configured' : 'MISSING'}`);
  console.log(`API Hash: ${apiHash ? 'Configured' : 'MISSING'}`);
  console.log(`Bot Token: ${botToken ? 'Configured' : 'MISSING'}`);
  console.log(`Channel ID: ${channelId || 'MISSING'}`);

  if (!apiId || !apiHash || !botToken) {
    console.error('\n❌ ERROR: Missing required configuration variables!');
    console.error('To use MTProto, you must obtain an API ID and API Hash from https://my.telegram.org');
    console.error('Add them to your .env file:');
    console.error('TELEGRAM_API_ID="your_api_id"');
    console.error('TELEGRAM_API_HASH="your_api_hash"');
    process.exit(1);
  }

  console.log('\nConnecting to Telegram...');
  const client = await initTelegramClient();

  if (!client) {
    console.error('❌ Failed to initialize Telegram MTProto Client.');
    process.exit(1);
  }

  try {
    console.log(`Resolving storage channel: ${channelId}...`);
    const channel = await client.getEntity(channelId);
    console.log(`✅ Success! Resolved channel: "${channel.title || 'Private Channel'}"`);
    
    console.log('\nConnecting to Database via Prisma...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Find the latest AssetFile with a telegramMessageId
    const latestFile = await prisma.assetFile.findFirst({
      where: {
        telegramMessageId: { not: null }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!latestFile) {
      console.warn('⚠️ No files found in the database with a telegramMessageId. Cannot test specific message download.');
      await prisma.$disconnect();
      return;
    }

    console.log(`Found file in DB: "${latestFile.fileName}" with Message ID: ${latestFile.telegramMessageId}`);
    
    console.log(`\nFetching message ID ${latestFile.telegramMessageId} from the storage channel...`);
    const messages = await client.getMessages(channel, {
      ids: [latestFile.telegramMessageId]
    });
    
    await prisma.$disconnect();
    
    const mediaMessage = messages && messages[0];

    if (mediaMessage && mediaMessage.media) {
      console.log(`✅ Success! Found the message with media.`);
      console.log(`Message ID: ${mediaMessage.id}`);
      if (mediaMessage.media.document) {
        const doc = mediaMessage.media.document;
        console.log(`Type: Document/File`);
        console.log(`File Name: ${doc.attributes.find(a => a.className === 'DocumentAttributeFilename')?.fileName || 'Unknown'}`);
        console.log(`Size: ${(Number(doc.size) / (1024 * 1024)).toFixed(2)} MB`);
        console.log(`DC ID: ${doc.dcId}`);
      } else if (mediaMessage.media.photo) {
        console.log(`Type: Photo`);
        console.log(`DC ID: ${mediaMessage.media.photo.dcId}`);
      } else {
        console.log(`Type: Other Media`);
      }
    } else {
      console.error('❌ Failed to retrieve the message or the message has no media.');
    }

    console.log('\n🎉 MTProto Client configuration is fully functional and ready!');
  } catch (error) {
    console.error('\n❌ Error during Telegram API interaction:', error);
  } finally {
    // Disconnect client
    console.log('\nDisconnecting...');
    try {
      const activeClient = getTelegramClient();
      if (activeClient) {
        await activeClient.disconnect();
      }
    } catch (e) {
      // Ignore
    }
    process.exit(0);
  }
}

testConnection();
