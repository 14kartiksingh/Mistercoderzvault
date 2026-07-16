const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');

// Load environment variables FIRST
dotenv.config({ path: '../.env' });

const routes = require('./routes');

const app = express();
const { initBot } = require('./utils/telegramBot');

// Initialize Telegram Bot
initBot();

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
