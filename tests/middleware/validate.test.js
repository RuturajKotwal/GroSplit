const {
  validateGroupId,
  validateCreateGroup,
  validateCreateExpense,
  validateCreateSettlement,
} = require('../../src/middleware/validate');

describe('Input Validation Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      params: {},
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('validateGroupId', () => {
    it('should call next() for a valid 24-char ObjectId', () => {
      req.params.id = '507f1f77bcf86cd799439011';
      validateGroupId(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 400 for an invalid ObjectId format', () => {
      req.params.id = 'invalid-id';
      validateGroupId(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid group ID format',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateCreateGroup', () => {
    it('should call next() for valid group input', () => {
      req.body = { name: 'Trip', members: ['Alice', 'Bob'] };
      validateCreateGroup(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 400 if name is invalid or whitespace', () => {
      req.body = { name: '   ', members: ['Alice'] };
      validateCreateGroup(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Group name is required',
      });
    });

    it('should return 400 if members array contains non-string elements', () => {
      req.body = { name: 'Trip', members: ['Alice', 123] };
      validateCreateGroup(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'All group members must be non-empty strings',
      });
    });
  });

  describe('validateCreateExpense', () => {
    it('should call next() for valid expense payload', () => {
      req.body = {
        paidBy: 'Alice',
        amount: 2000,
        description: 'Lunch',
        splitBetween: ['Alice', 'Bob'],
      };
      validateCreateExpense(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 400 if paidBy is missing or empty string', () => {
      req.body = { paidBy: '', amount: 1000, description: 'Snack' };
      validateCreateExpense(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Payer (paidBy) is required',
      });
    });

    it('should return 400 if amount is missing or not a positive integer', () => {
      req.body = { paidBy: 'Alice', amount: 0, description: 'Free' };
      validateCreateExpense(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Amount must be a positive integer (in cents)',
      });
    });

    it('should return 400 if description is missing', () => {
      req.body = { paidBy: 'Alice', amount: 1000, description: '' };
      validateCreateExpense(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Description is required',
      });
    });

    it('should return 400 if splitBetween is invalid format', () => {
      req.body = {
        paidBy: 'Alice',
        amount: 1000,
        description: 'Taxi',
        splitBetween: 'invalid', // Not an array
      };
      validateCreateExpense(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'splitBetween must be a non-empty array of strings if provided',
      });

      req.body.splitBetween = ['Alice', '']; // Invalid element
      res.status.mockClear();
      res.json.mockClear();
      validateCreateExpense(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'All members in splitBetween must be non-empty strings',
      });
    });
  });

  describe('validateCreateSettlement', () => {
    it('should call next() for valid settlement input', () => {
      req.body = { from: 'Bob', to: 'Alice', amount: 1000 };
      validateCreateSettlement(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 400 if from is missing', () => {
      req.body = { from: '', to: 'Alice', amount: 1000 };
      validateCreateSettlement(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Payer ('from') is required",
      });
    });

    it('should return 400 if to is missing', () => {
      req.body = { from: 'Bob', to: '', amount: 1000 };
      validateCreateSettlement(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Recipient ('to') is required",
      });
    });

    it('should return 400 if from and to are identical', () => {
      req.body = { from: 'Alice', to: 'Alice', amount: 1000 };
      validateCreateSettlement(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "'from' and 'to' members cannot be the same",
      });
    });

    it('should return 400 if amount is non-integer or <= 0', () => {
      req.body = { from: 'Bob', to: 'Alice', amount: -500 };
      validateCreateSettlement(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Amount must be a positive integer (in cents)',
      });
    });
  });
});
