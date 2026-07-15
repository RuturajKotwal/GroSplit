const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Group = require('../src/models/Group');
const Expense = require('../src/models/Expense');
const Settlement = require('../src/models/Settlement');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Group.deleteMany({});
  await Expense.deleteMany({});
  await Settlement.deleteMany({});
});

describe('Group Model', () => {
  it('should create a valid group', async () => {
    const group = new Group({
      name: 'Apartment 4B',
      members: ['Alice', 'Bob', 'Charlie'],
    });

    const savedGroup = await group.save();
    expect(savedGroup._id).toBeDefined();
    expect(savedGroup.name).toBe('Apartment 4B');
    expect(savedGroup.members).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('should fail validation if group name is missing', async () => {
    const group = new Group({
      members: ['Alice'],
    });

    await expect(group.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should fail validation if members array is empty', async () => {
    const group = new Group({
      name: 'Empty Group',
      members: [],
    });

    await expect(group.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });
});

describe('Expense Model', () => {
  let group;

  beforeEach(async () => {
    group = await Group.create({
      name: 'Groceries Team',
      members: ['Alice', 'Bob', 'Charlie'],
    });
  });

  it('should create a valid expense and default splitBetween to all members', async () => {
    const expense = new Expense({
      groupId: group._id,
      paidBy: 'Alice',
      amount: 3000, // $30.00 in cents
      description: 'Weekly Groceries',
    });

    const savedExpense = await expense.save();
    expect(savedExpense._id).toBeDefined();
    expect(savedExpense.amount).toBe(3000);
    expect(savedExpense.splitBetween).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('should allow custom splitBetween if all are valid members', async () => {
    const expense = new Expense({
      groupId: group._id,
      paidBy: 'Bob',
      amount: 1500,
      description: 'Snacks',
      splitBetween: ['Bob', 'Charlie'],
    });

    const savedExpense = await expense.save();
    expect(savedExpense.splitBetween).toEqual(['Bob', 'Charlie']);
  });

  it('should fail if amount is negative or not an integer', async () => {
    const invalidAmountExpense = new Expense({
      groupId: group._id,
      paidBy: 'Alice',
      amount: 12.5, // float
      description: 'Invalid Float Amount',
    });

    await expect(invalidAmountExpense.save()).rejects.toThrow(
      mongoose.Error.ValidationError
    );

    const negativeAmountExpense = new Expense({
      groupId: group._id,
      paidBy: 'Alice',
      amount: -500,
      description: 'Negative Amount',
    });

    await expect(negativeAmountExpense.save()).rejects.toThrow(
      mongoose.Error.ValidationError
    );
  });

  it('should fail if paidBy is not a group member', async () => {
    const expense = new Expense({
      groupId: group._id,
      paidBy: 'Dave', // Not in group
      amount: 2000,
      description: 'Dinner',
    });

    await expect(expense.save()).rejects.toThrow(
      mongoose.Error.ValidationError
    );
  });

  it('should fail if member in splitBetween is not a group member', async () => {
    const expense = new Expense({
      groupId: group._id,
      paidBy: 'Alice',
      amount: 2000,
      description: 'Drinks',
      splitBetween: ['Alice', 'Dave'], // Dave is invalid
    });

    await expect(expense.save()).rejects.toThrow(
      mongoose.Error.ValidationError
    );
  });

  it('should fail if referenced group does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const expense = new Expense({
      groupId: fakeId,
      paidBy: 'Alice',
      amount: 1000,
      description: 'Orphan Expense',
    });

    await expect(expense.save()).rejects.toThrow(
      mongoose.Error.ValidationError
    );
  });
});

describe('Settlement Model', () => {
  let group;

  beforeEach(async () => {
    group = await Group.create({
      name: 'Flatmates',
      members: ['Alice', 'Bob', 'Charlie'],
    });
  });

  it('should create a valid settlement', async () => {
    const settlement = new Settlement({
      groupId: group._id,
      from: 'Bob',
      to: 'Alice',
      amount: 1000, // $10.00 in cents
    });

    const saved = await settlement.save();
    expect(saved._id).toBeDefined();
    expect(saved.from).toBe('Bob');
    expect(saved.to).toBe('Alice');
    expect(saved.amount).toBe(1000);
  });

  it('should fail if from and to are the same person', async () => {
    const settlement = new Settlement({
      groupId: group._id,
      from: 'Alice',
      to: 'Alice',
      amount: 1000,
    });

    await expect(settlement.save()).rejects.toThrow(
      mongoose.Error.ValidationError
    );
  });

  it('should fail if from or to is not a member of the group', async () => {
    const invalidFrom = new Settlement({
      groupId: group._id,
      from: 'Dave',
      to: 'Alice',
      amount: 1000,
    });

    await expect(invalidFrom.save()).rejects.toThrow(
      mongoose.Error.ValidationError
    );

    const invalidTo = new Settlement({
      groupId: group._id,
      from: 'Alice',
      to: 'Dave',
      amount: 1000,
    });

    await expect(invalidTo.save()).rejects.toThrow(
      mongoose.Error.ValidationError
    );
  });
});
