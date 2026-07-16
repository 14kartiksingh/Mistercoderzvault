/**
 * Standardize success API responses.
 * @param {Object} res - Express response object
 * @param {Object|Array} data - Payload to send
 * @param {number} statusCode - HTTP Status code (default 200)
 */
const sendSuccess = (res, data, statusCode = 200) => {
  // Dedicated serialization helper for BigInt to string
  const serializeBigInt = (obj) => {
    return JSON.parse(
      JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );
  };

  return res.status(statusCode).json({
    status: 'success',
    data: serializeBigInt(data),
  });
};

/**
 * Standardize error API responses.
 * @param {Object} res - Express response object
 * @param {string} message - Error description
 * @param {number} statusCode - HTTP Status code (default 400)
 */
const sendError = (res, message, statusCode = 400) => {
  return res.status(statusCode).json({
    status: 'error',
    message,
  });
};

module.exports = {
  sendSuccess,
  sendError,
};
