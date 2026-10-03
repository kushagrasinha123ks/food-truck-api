const express = require('express');
const { orders } = require('./orders');

const router = express.Router();
const bills = new Map();
const billIdsByOrder = new Map();
let nextBillNumber = 501;

router.post('/', (req, res) => {
  const { orderId } = req.body || {};

  if (typeof orderId !== 'string' || !orderId) {
    return res.status(400).json({
      success: false,
      message: 'Order ID is required',
      errorCode: 'VALIDATION_ERROR'
    });
  }

  const order = orders.get(orderId);
  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found',
      errorCode: 'ORDER_NOT_FOUND'
    });
  }

  if (billIdsByOrder.has(orderId)) {
    return res.status(409).json({
      success: false,
      message: 'A bill already exists for this order',
      errorCode: 'BILL_ALREADY_EXISTS'
    });
  }

  const taxPercent = Number(process.env.TAX_PERCENT);
  const subtotal = order.totalAmount;
  const tax = Number((subtotal * taxPercent / 100).toFixed(2));
  const total = Number((subtotal + tax).toFixed(2));
  const billId = `BILL-${nextBillNumber++}`;
  const bill = {
    billId,
    orderId,
    items: order.items.map((item) => ({ ...item })),
    subtotal,
    tax,
    total
  };

  bills.set(billId, bill);
  billIdsByOrder.set(orderId, billId);

  return res.status(201).json({
    success: true,
    message: 'Bill generated successfully',
    data: { billId, orderId, subtotal, tax, total }
  });
});

router.get('/:billId/receipt', (req, res) => {
  const bill = bills.get(req.params.billId);

  if (!bill) {
    return res.status(404).json({
      success: false,
      message: 'Bill not found',
      errorCode: 'BILL_NOT_FOUND'
    });
  }

  return res.status(200).json({
    success: true,
    data: bill
  });
});

module.exports = router;
