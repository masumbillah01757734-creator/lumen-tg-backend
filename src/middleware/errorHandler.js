const MULTER_ERROR_STATUS = {
  LIMIT_FILE_SIZE: 413,
  LIMIT_UNEXPECTED_FILE: 400,
  LIMIT_FILE_COUNT: 400,
  LIMIT_PART_COUNT: 400,
  LIMIT_FIELD_KEY: 400,
  LIMIT_FIELD_VALUE: 400,
  LIMIT_FIELD_COUNT: 400,
};

function errorHandler(err, req, res, next) {
  console.error("[Error]", err.message);

  // Multer errors (e.g. file exceeds the configured size limit) don't set
  // statusCode, so without this they'd fall through as a misleading 500.
  if (err.name === "MulterError") {
    const status = MULTER_ERROR_STATUS[err.code] || 400;
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? `File is too large. Maximum allowed size is ${process.env.MAX_UPLOAD_MB || 2000}MB.`
        : err.message;
    return res.status(status).json({ success: false, message, code: err.code });
  }

  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
}

module.exports = errorHandler;
