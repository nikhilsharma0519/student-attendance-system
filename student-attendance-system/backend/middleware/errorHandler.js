const multer = require('multer');
const config = require('../config');

function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? `File is too large (max ${Math.round(config.maxUploadBytes / 1024 / 1024)} MB)`
      : `Upload error: ${err.message}`;
    return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Request body is not valid JSON' });
  }
  const status = err.status || 500;
  if (status >= 500) console.error('[error]', err);
  res.status(status).json({
    message: status >= 500 && config.isProd ? 'Something went wrong on the server' : err.message,
    ...(err.details ? { errors: err.details } : {}),
  });
}

module.exports = { notFound, errorHandler };
