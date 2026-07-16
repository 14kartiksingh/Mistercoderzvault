/**
 * Health Controller
 * Responsible for handling health check requests.
 */

const checkHealth = (req, res) => {
  res.json({ status: 'ok', message: 'MISTER CODERZ Vault Server is running' });
};

module.exports = {
  checkHealth
};
