// Error with an HTTP status code. Thrown by controllers, converted to JSON by the error middleware.
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
module.exports = HttpError;
