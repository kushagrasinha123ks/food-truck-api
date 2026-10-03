function apiKeyMiddleware(req, res, next) {
  const apiKey = req.get('X-API-Key');

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Valid API key is required',
      errorCode: 'INVALID_API_KEY'
    });
  }

  next();
}

module.exports = apiKeyMiddleware;
