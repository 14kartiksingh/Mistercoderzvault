const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: '../.env' }); // Load from root if exists

const routes = require('./routes');

// Create the Express application
const app = express();

// Register middleware
app.use(cors());
app.use(express.json());

// Register routes
app.use('/', routes);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
