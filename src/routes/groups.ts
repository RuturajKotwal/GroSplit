import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Group from '../models/Group';
import Expense from '../models/Expense';
import Settlement from '../models/Settlement';
import { calculateBalances, simplifyDebts } from '../services/balanceService';
import {
  validateGroupId,
  validateCreateGroup,
  validateCreateExpense,
  validateCreateSettlement,
} from '../middleware/validate';
import { requireApiKey } from '../middleware/auth';
import { writeRateLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// Middleware to ensure database connection before processing group requests
router.use(async (_req: Request, res: Response, next: NextFunction) => {
  if (mongoose.connection.readyState !== 1) {
    const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (MONGO_URI) {
      try {
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
      } catch (err) {
        return res.status(500).json({
          error: `Database connection failed: ${(err as Error).message}`,
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

/**
 * @openapi
 * /groups:
 *   post:
 *     summary: Create a new expense group
 *     tags:
 *       - Groups
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GroupInput'
 *     responses:
 *       201:
 *         description: Group created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Group'
 *       400:
 *         description: Invalid input payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid API key
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  '/',
  writeRateLimiter,
  requireApiKey,
  validateCreateGroup,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, members } = req.body;
      const group = await Group.create({ name, members });
      return res.status(201).json(group);
    } catch (err) {
      if ((err as Error).name === 'ValidationError') {
        return res.status(400).json({ error: (err as Error).message });
      }
      return next(err);
    }
  }
);

/**
 * @openapi
 * /groups/{id}:
 *   get:
 *     summary: Fetch group details by ID
 *     tags:
 *       - Groups
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 24-character hex MongoDB ObjectId
 *     responses:
 *       200:
 *         description: Group details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Group'
 *       400:
 *         description: Invalid ObjectId format
 *       404:
 *         description: Group not found
 */
router.get(
  '/:id',
  validateGroupId,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const group = await Group.findById(req.params.id);
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }
      return res.status(200).json(group);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * @openapi
 * /groups/{id}/expenses:
 *   post:
 *     summary: Record a new expense for a group
 *     tags:
 *       - Expenses
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Group ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExpenseInput'
 *     responses:
 *       201:
 *         description: Expense recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Expense'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Group not found
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  '/:id/expenses',
  writeRateLimiter,
  requireApiKey,
  validateGroupId,
  validateCreateExpense,
  async (req: Request, res: Response, next: NextFunction) => {
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
      if ((err as Error).name === 'ValidationError') {
        return res.status(400).json({ error: (err as Error).message });
      }
      return next(err);
    }
  }
);

/**
 * @openapi
 * /groups/{id}/expenses:
 *   get:
 *     summary: List all expenses recorded for a group
 *     tags:
 *       - Expenses
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Group ObjectId
 *     responses:
 *       200:
 *         description: List of expenses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Expense'
 *       404:
 *         description: Group not found
 */
router.get(
  '/:id/expenses',
  validateGroupId,
  async (req: Request, res: Response, next: NextFunction) => {
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
  }
);

/**
 * @openapi
 * /groups/{id}/balances:
 *   get:
 *     summary: Calculate exact zero-sum net balance for each group member
 *     tags:
 *       - Balances
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Group ObjectId
 *     responses:
 *       200:
 *         description: Calculated net balances in integer cents
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BalanceResponse'
 *       404:
 *         description: Group not found
 */
router.get(
  '/:id/balances',
  validateGroupId,
  async (req: Request, res: Response, next: NextFunction) => {
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
  }
);

/**
 * @openapi
 * /groups/{id}/settlements/suggested:
 *   get:
 *     summary: Get minimal debt simplification transfers (greedy algorithm)
 *     tags:
 *       - Settlements
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Group ObjectId
 *     responses:
 *       200:
 *         description: Minimal list of suggested debt settlement transfers
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuggestedSettlementsResponse'
 *       404:
 *         description: Group not found
 */
router.get(
  '/:id/settlements/suggested',
  validateGroupId,
  async (req: Request, res: Response, next: NextFunction) => {
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

/**
 * @openapi
 * /groups/{id}/settlements:
 *   post:
 *     summary: Record an actual repayment settlement between two members
 *     tags:
 *       - Settlements
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Group ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SettlementInput'
 *     responses:
 *       201:
 *         description: Settlement recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Settlement'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Group not found
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  '/:id/settlements',
  writeRateLimiter,
  requireApiKey,
  validateGroupId,
  validateCreateSettlement,
  async (req: Request, res: Response, next: NextFunction) => {
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
      if ((err as Error).name === 'ValidationError') {
        return res.status(400).json({ error: (err as Error).message });
      }
      return next(err);
    }
  }
);

export default router;
