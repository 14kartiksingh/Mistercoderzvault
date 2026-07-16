const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: '../.env' }); // Load from root if exists

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'MISTER CODERZ Vault Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
