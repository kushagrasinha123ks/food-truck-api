const crypto = require('crypto');
const express = require('express');
const { authMiddleware, sessions } = require('../middleware/auth');

const router = express.Router();
const users = [];
let nextUserNumber = 1001;

function validationError(res, message) {
  return res.status(400).json({
    success: false,
    message,
    errorCode: 'VALIDATION_ERROR'
  });
}

router.post('/register', (req, res) => {
  const { name, email, password } = req.body || {};

  if (typeof name !== 'string' || !name.trim()) {
    return validationError(res, 'Name is required');
  }

  if (typeof email !== 'string' || !email.trim()) {
    return validationError(res, 'Email is required');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(normalizedEmail)) {
    return validationError(res, 'Email format is invalid');
  }

  if (typeof password !== 'string' || !password) {
    return validationError(res, 'Password is required');
  }

  if (users.some((user) => user.email === normalizedEmail)) {
    return res.status(409).json({
      success: false,
      message: 'A user with this email already exists',
      errorCode: 'DUPLICATE_EMAIL'
    });
  }

  const user = {
    id: `USR-${nextUserNumber++}`,
    name: name.trim(),
    email: normalizedEmail,
    password
  };
  users.push(user);

  return res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      userId: user.id,
      name: user.name,
      email: user.email
    }
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};

  if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
    return validationError(res, 'Email and password are required');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = users.find(
    (candidate) => candidate.email === normalizedEmail && candidate.password === password
  );

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password',
      errorCode: 'INVALID_CREDENTIALS'
    });
  }

  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, user.id);

  return res.status(200).json({
    success: true,
    message: 'Login successful',
    token,
    data: { userId: user.id }
  });
});

router.post('/logout', authMiddleware, (req, res) => {
  sessions.delete(req.token);

  return res.status(200).json({
    success: true,
    message: 'Logout successful'
  });
});

module.exports = router;
