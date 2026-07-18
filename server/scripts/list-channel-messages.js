const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
const { initTelegramClient } = require('../utils/telegramClient');

async function main() {
  const channelId = process.env.TELEGRAM_STORAGE_CHANNEL_ID;
  const client = await initTelegramClient();
  if (!client) {
    console.error('Failed to init client');
    process.exit(1);
  }

  try {
    const channel = await client.getEntity(channelId);
    console.log(`Resolved channel: "${channel.title}"`);
    
    // Fetch last 100 messages
    const messages = await client.getMessages(channel, { limit: 100 });
    console.log(`Fetched ${messages.length} messages:`);
    
    for (const msg of messages) {
      if (msg.media && msg.media.document) {
        const doc = msg.media.document;
        const filenameAttr = doc.attributes.find(a => a.className === 'DocumentAttributeFilename');
        const filename = filenameAttr ? filenameAttr.fileName : 'Unknown';
        const sizeMB = (Number(doc.size) / (1024 * 1024)).toFixed(2);
        console.log(`Message ID: ${msg.id} | File: "${filename}" | Size: ${sizeMB} MB`);
      }
    }
  } catch (err) {
    console.error('Error fetching messages:', err);
  } finally {
    await client.disconnect();
  }
}
main();
