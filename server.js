require('dotenv').config();

const express = require('express');
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const { router: orderRoutes } = require('./routes/orders');
const billRoutes = require('./routes/bills');
const { authMiddleware } = require('./middleware/auth');
const apiKeyMiddleware = require('./middleware/apiKey');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

app.use('/auth', authRoutes);
app.use('/menu', menuRoutes);
app.use('/orders', authMiddleware, apiKeyMiddleware, orderRoutes);
app.use('/bills', authMiddleware, apiKeyMiddleware, billRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    errorCode: 'NOT_FOUND'
  });
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      success: false,
      message: 'Request body contains invalid JSON',
      errorCode: 'VALIDATION_ERROR'
    });
  }

  console.error(error);
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    errorCode: 'INTERNAL_SERVER_ERROR'
  });
});

app.listen(port, () => {
  console.log(`Food Truck API is running at http://localhost:${port}`);
});
