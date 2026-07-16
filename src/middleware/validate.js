const mongoose = require('mongoose');

/**
 * Middleware to validate MongoDB ObjectId parameters.
 */
function validateGroupId(req, res, next) {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid group ID format' });
  }
  next();
}

/**
 * Middleware to validate Group creation payload.
 */
function validateCreateGroup(req, res, next) {
  const { name, members } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Group name is required' });
  }

  if (!Array.isArray(members) || members.length === 0) {
    return res
      .status(400)
      .json({ error: 'Group must have at least one member' });
  }

  for (const member of members) {
    if (!member || typeof member !== 'string' || member.trim() === '') {
      return res
        .status(400)
        .json({ error: 'All group members must be non-empty strings' });
    }
  }

  next();
}

/**
 * Middleware to validate Expense creation payload.
 */
function validateCreateExpense(req, res, next) {
  const { paidBy, amount, description, splitBetween } = req.body;

  if (!paidBy || typeof paidBy !== 'string' || paidBy.trim() === '') {
    return res.status(400).json({ error: 'Payer (paidBy) is required' });
  }

  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) {
    return res
      .status(400)
      .json({ error: 'Amount must be a positive integer (in cents)' });
  }

  if (
    !description ||
    typeof description !== 'string' ||
    description.trim() === ''
  ) {
    return res.status(400).json({ error: 'Description is required' });
  }

  if (splitBetween !== undefined) {
    if (!Array.isArray(splitBetween) || splitBetween.length === 0) {
      return res.status(400).json({
        error: 'splitBetween must be a non-empty array of strings if provided',
      });
    }
    for (const member of splitBetween) {
      if (!member || typeof member !== 'string' || member.trim() === '') {
        return res.status(400).json({
          error: 'All members in splitBetween must be non-empty strings',
        });
      }
    }
  }

  next();
}

/**
 * Middleware to validate Settlement creation payload.
 */
function validateCreateSettlement(req, res, next) {
  const { from, to, amount } = req.body;

  if (!from || typeof from !== 'string' || from.trim() === '') {
    return res.status(400).json({ error: "Payer ('from') is required" });
  }

  if (!to || typeof to !== 'string' || to.trim() === '') {
    return res.status(400).json({ error: "Recipient ('to') is required" });
  }

  if (from === to) {
    return res
      .status(400)
      .json({ error: "'from' and 'to' members cannot be the same" });
  }

  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) {
    return res
      .status(400)
      .json({ error: 'Amount must be a positive integer (in cents)' });
  }

  next();
}

module.exports = {
  validateGroupId,
  validateCreateGroup,
  validateCreateExpense,
  validateCreateSettlement,
};
