const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

// Load environment variables FIRST
const rootEnvPath = path.join(__dirname, '../.env');
const localEnvPath = path.join(__dirname, '.env');

if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  dotenv.config();
}

const routes = require('./routes');

const app = express();
const { initBot } = require('./utils/telegramBot');
const { initTelegramClient } = require('./utils/telegramClient');

// Initialize Telegram Bot (Polling)
initBot();

// Initialize Telegram MTProto Client (Streaming Downloads)
initTelegramClient();

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Register routes
app.use('/', routes);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
