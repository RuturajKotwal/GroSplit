const express = require('express');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const {
  calculateBalances,
  simplifyDebts,
} = require('../services/balanceService');
const {
  validateGroupId,
  validateCreateGroup,
  validateCreateExpense,
  validateCreateSettlement,
} = require('../middleware/validate');

const mongoose = require('mongoose');

const router = express.Router();

// Middleware to ensure database connection before processing group requests
router.use(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (MONGO_URI) {
      try {
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
      } catch (err) {
        return res.status(500).json({
          error: `Database connection failed: ${err.message}`,
        });
      }
    } else {
      return res.status(500).json({
        error:
          'Database connection failed: Neither MONGO_URI nor MONGODB_URI environment variable is configured.',
      });
    }
  }
  next();
});

// POST /groups - Create a new group
router.post('/', validateCreateGroup, async (req, res, next) => {
  try {
    const { name, members } = req.body;
    const group = await Group.create({ name, members });
    return res.status(201).json(group);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    return next(err);
  }
});

// GET /groups/:id - Fetch group details
router.get('/:id', validateGroupId, async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    return res.status(200).json(group);
  } catch (err) {
    return next(err);
  }
});

// POST /groups/:id/expenses - Add an expense to a group
router.post(
  '/:id/expenses',
  validateGroupId,
  validateCreateExpense,
  async (req, res, next) => {
    try {
      const group = await Group.findById(req.params.id);
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      const { paidBy, amount, description, splitBetween, shares, ratios } =
        req.body;

      const expense = new Expense({
        groupId: group._id,
        paidBy,
        amount,
        description,
        splitBetween,
        shares,
        ratios,
      });

      await expense.save();
      return res.status(201).json(expense);
    } catch (err) {
      if (err.name === 'ValidationError') {
        return res.status(400).json({ error: err.message });
      }
      return next(err);
    }
  }
);

// GET /groups/:id/expenses - List all expenses for a group
router.get('/:id/expenses', validateGroupId, async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const expenses = await Expense.find({ groupId: group._id }).sort({
      date: 1,
    });
    return res.status(200).json(expenses);
  } catch (err) {
    return next(err);
  }
});

// GET /groups/:id/balances - Calculate net balance per member
router.get('/:id/balances', validateGroupId, async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const expenses = await Expense.find({ groupId: group._id });
    const settlements = await Settlement.find({ groupId: group._id });

    const balances = calculateBalances(expenses, settlements, group.members);
    return res.status(200).json({ groupId: group._id, balances });
  } catch (err) {
    return next(err);
  }
});

// GET /groups/:id/settlements/suggested - Get simplified debt list
router.get(
  '/:id/settlements/suggested',
  validateGroupId,
  async (req, res, next) => {
    try {
      const group = await Group.findById(req.params.id);
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      const expenses = await Expense.find({ groupId: group._id });
      const settlements = await Settlement.find({ groupId: group._id });

      const balances = calculateBalances(expenses, settlements, group.members);
      const suggestedSettlements = simplifyDebts(balances);

      return res
        .status(200)
        .json({ groupId: group._id, settlements: suggestedSettlements });
    } catch (err) {
      return next(err);
    }
  }
);

// POST /groups/:id/settlements - Record an actual repayment
router.post(
  '/:id/settlements',
  validateGroupId,
  validateCreateSettlement,
  async (req, res, next) => {
    try {
      const group = await Group.findById(req.params.id);
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      const { from, to, amount } = req.body;

      const settlement = new Settlement({
        groupId: group._id,
        from,
        to,
        amount,
      });

      await settlement.save();
      return res.status(201).json(settlement);
    } catch (err) {
      if (err.name === 'ValidationError') {
        return res.status(400).json({ error: err.message });
      }
      return next(err);
    }
  }
);

module.exports = router;
