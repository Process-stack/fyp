export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status =
    Number(error.status) ||
    (error.name === "MulterError" ? (error.code === "LIMIT_FILE_SIZE" ? 413 : 400) : 500);
  if (status >= 500) console.error(error);
  res.status(status).json({
    error:
      status >= 500
        ? "The request could not be completed. Check the server logs."
        : error.message
  });
}
