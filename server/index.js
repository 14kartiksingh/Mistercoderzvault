const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const routes = require('./routes');

// Load environment variables
dotenv.config({ path: '../.env' });

const app = express();

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
