const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const apiId = process.env.TELEGRAM_API_ID ? parseInt(process.env.TELEGRAM_API_ID, 10) : null;
const apiHash = process.env.TELEGRAM_API_HASH;
const botToken = process.env.TELEGRAM_BOT_TOKEN;

let client = null;
let clientInitPromise = null;

/**
 * Initializes and starts the Telegram MTProto client using a bot token
 */
const initTelegramClient = async () => {
  if (client) return client;
  if (clientInitPromise) return clientInitPromise;

  clientInitPromise = (async () => {
    if (!apiId || isNaN(apiId) || !apiHash || !botToken) {
      console.warn(
        '⚠️  [Telegram MTProto] TELEGRAM_API_ID, TELEGRAM_API_HASH, or TELEGRAM_BOT_TOKEN is missing. ' +
        'Streaming downloads will not be available. Please configure them in your .env file.'
      );
      clientInitPromise = null;
      return null;
    }

    try {
      console.log('[Telegram MTProto] Initializing Telegram Client (MTProto)...');
      client = new TelegramClient(new StringSession(''), apiId, apiHash, {
        connectionRetries: 5,
        useWSSecure: true, // Secure WebSocket connection
      });

      await client.start({
        botAuthToken: botToken,
      });

      console.log('✅ [Telegram MTProto] Client authenticated and connected successfully.');
      return client;
    } catch (error) {
      console.error('❌ [Telegram MTProto] Failed to initialize/start Telegram Client:', error);
      client = null;
      clientInitPromise = null;
      return null;
    }
  })();

  return clientInitPromise;
};

/**
 * Gets the active Telegram MTProto client instance
 */
const getTelegramClient = () => client;

module.exports = {
  initTelegramClient,
  getTelegramClient,
};
