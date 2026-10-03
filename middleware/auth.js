const sessions = new Map();

function authMiddleware(req, res, next) {
  const authorization = req.get('Authorization');

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Valid bearer token is required',
      errorCode: 'UNAUTHORIZED'
    });
  }

  const token = authorization.slice(7).trim();
  const userId = sessions.get(token);

  if (!token || !userId) {
    return res.status(401).json({
      success: false,
      message: 'Valid bearer token is required',
      errorCode: 'UNAUTHORIZED'
    });
  }

  req.token = token;
  req.userId = userId;
  next();
}

module.exports = { authMiddleware, sessions };
