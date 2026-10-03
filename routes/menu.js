const express = require('express');
const menu = require('../data/menu');

const router = express.Router();

function queryError(res, message) {
  return res.status(400).json({
    success: false,
    message,
    errorCode: 'VALIDATION_ERROR'
  });
}

router.get('/', (req, res) => {
  const { category, available, minPrice, maxPrice, sort } = req.query;
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const limit = req.query.limit === undefined ? 5 : Number(req.query.limit);

  if (!Number.isInteger(page) || page < 1) {
    return queryError(res, 'Page must be a positive integer');
  }

  if (!Number.isInteger(limit) || limit < 1) {
    return queryError(res, 'Limit must be a positive integer');
  }

  if (available !== undefined && available !== 'true' && available !== 'false') {
    return queryError(res, 'Available must be true or false');
  }

  const parsedMinPrice = minPrice === undefined ? undefined : Number(minPrice);
  const parsedMaxPrice = maxPrice === undefined ? undefined : Number(maxPrice);

  if (parsedMinPrice !== undefined && (!Number.isFinite(parsedMinPrice) || parsedMinPrice < 0)) {
    return queryError(res, 'Minimum price must be a non-negative number');
  }

  if (parsedMaxPrice !== undefined && (!Number.isFinite(parsedMaxPrice) || parsedMaxPrice < 0)) {
    return queryError(res, 'Maximum price must be a non-negative number');
  }

  if (parsedMinPrice !== undefined && parsedMaxPrice !== undefined && parsedMinPrice > parsedMaxPrice) {
    return queryError(res, 'Minimum price cannot be greater than maximum price');
  }

  if (sort !== undefined && sort !== 'price' && sort !== '-price') {
    return queryError(res, 'Sort must be price or -price');
  }

  let results = [...menu];

  if (category !== undefined) {
    results = results.filter((item) => item.category === String(category).toLowerCase());
  }
  if (available !== undefined) {
    const isAvailable = available === 'true';
    results = results.filter((item) => item.available === isAvailable);
  }
  if (parsedMinPrice !== undefined) {
    results = results.filter((item) => item.price >= parsedMinPrice);
  }
  if (parsedMaxPrice !== undefined) {
    results = results.filter((item) => item.price <= parsedMaxPrice);
  }
  if (sort) {
    const direction = sort === 'price' ? 1 : -1;
    results.sort((first, second) => (first.price - second.price) * direction);
  }

  const totalItems = results.length;
  const totalPages = Math.ceil(totalItems / limit);
  const start = (page - 1) * limit;

  return res.status(200).json({
    success: true,
    page,
    limit,
    totalItems,
    totalPages,
    data: results.slice(start, start + limit)
  });
});

router.get('/:id', (req, res) => {
  const item = menu.find((candidate) => candidate.id === req.params.id);

  if (!item) {
    return res.status(404).json({
      success: false,
      message: 'Menu item not found',
      errorCode: 'MENU_ITEM_NOT_FOUND'
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Menu item retrieved successfully',
    data: item
  });
});

module.exports = router;
