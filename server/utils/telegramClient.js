const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const fs = require('fs');
const path = require('path');

const apiId = process.env.TELEGRAM_API_ID ? parseInt(process.env.TELEGRAM_API_ID, 10) : null;
const apiHash = process.env.TELEGRAM_API_HASH;
const botToken = process.env.TELEGRAM_BOT_TOKEN;

let client = null;
let clientInitPromise = null;

const sessionFilePath = path.join(__dirname, '..', 'session.txt');

/**
 * Initializes and starts the Telegram MTProto client using a bot token and persisting session
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
      
      // Load saved session if it exists
      let savedSession = '';
      if (fs.existsSync(sessionFilePath)) {
        try {
          savedSession = fs.readFileSync(sessionFilePath, 'utf8').trim();
          console.log('[Telegram MTProto] Loaded saved session from session.txt');
        } catch (e) {
          console.warn('[Telegram MTProto] Could not read session.txt, starting fresh session');
        }
      }

      const stringSession = new StringSession(savedSession);
      client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
        useWSSecure: true,
      });

      // Start client. If session is valid, client.start will bypass ImportBotAuthorization.
      await client.start({
        botAuthToken: botToken,
      });

      console.log('✅ [Telegram MTProto] Client authenticated and connected successfully.');
      
      // Save session if it was newly created or updated
      try {
        const currentSession = client.session.save();
        if (currentSession !== savedSession) {
          fs.writeFileSync(sessionFilePath, currentSession, 'utf8');
          console.log('[Telegram MTProto] Saved authenticated session to session.txt');
        }
      } catch (saveError) {
        console.error('[Telegram MTProto] Failed to save session string:', saveError);
      }

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
