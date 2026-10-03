const express = require('express');
const menu = require('../data/menu');

const router = express.Router();
const orders = new Map();
let nextOrderNumber = 1001;

function validateAndPriceItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      error: { status: 400, message: 'Items must be a non-empty array', errorCode: 'VALIDATION_ERROR' }
    };
  }

  const pricedItems = [];

  for (const requestedItem of items) {
    if (!requestedItem || typeof requestedItem.menuItemId !== 'string') {
      return {
        error: { status: 400, message: 'Each item must include a menuItemId', errorCode: 'VALIDATION_ERROR' }
      };
    }

    const menuItem = menu.find((candidate) => candidate.id === requestedItem.menuItemId);
    if (!menuItem) {
      return {
        error: { status: 404, message: 'Menu item not found', errorCode: 'MENU_ITEM_NOT_FOUND' }
      };
    }

    if (!menuItem.available) {
      return {
        error: { status: 400, message: 'Menu item is unavailable', errorCode: 'MENU_ITEM_UNAVAILABLE' }
      };
    }

    if (!Number.isInteger(requestedItem.quantity) || requestedItem.quantity < 1) {
      return {
        error: { status: 400, message: 'Quantity must be a positive integer', errorCode: 'VALIDATION_ERROR' }
      };
    }

    pricedItems.push({
      menuItemId: menuItem.id,
      quantity: requestedItem.quantity,
      unitPrice: menuItem.price
    });
  }

  return { items: pricedItems };
}

function sendItemError(res, error) {
  return res.status(error.status).json({
    success: false,
    message: error.message,
    errorCode: error.errorCode
  });
}

router.post('/', (req, res) => {
  const result = validateAndPriceItems(req.body && req.body.items);
  if (result.error) return sendItemError(res, result.error);

  const orderId = `ORD-${nextOrderNumber++}`;
  const totalAmount = result.items.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0
  );
  const order = { orderId, status: 'created', items: result.items, totalAmount };
  orders.set(orderId, order);

  return res.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: order
  });
});

router.get('/:id', (req, res) => {
  const order = orders.get(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found',
      errorCode: 'ORDER_NOT_FOUND'
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Order retrieved successfully',
    data: order
  });
});

router.put('/:id', (req, res) => {
  const existingOrder = orders.get(req.params.id);

  if (!existingOrder) {
    return res.status(404).json({
      success: false,
      message: 'Order not found',
      errorCode: 'ORDER_NOT_FOUND'
    });
  }

  const result = validateAndPriceItems(req.body && req.body.items);
  if (result.error) return sendItemError(res, result.error);

  const totalAmount = result.items.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0
  );
  const updatedOrder = {
    orderId: existingOrder.orderId,
    status: existingOrder.status,
    items: result.items,
    totalAmount
  };
  orders.set(existingOrder.orderId, updatedOrder);

  return res.status(200).json({
    success: true,
    message: 'Order updated successfully',
    data: updatedOrder
  });
});

router.delete('/:id', (req, res) => {
  if (!orders.has(req.params.id)) {
    return res.status(404).json({
      success: false,
      message: 'Order not found',
      errorCode: 'ORDER_NOT_FOUND'
    });
  }

  orders.delete(req.params.id);
  return res.status(200).json({
    success: true,
    message: 'Order deleted successfully'
  });
});

module.exports = { router, orders };
