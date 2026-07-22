import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import Group from '../../src/models/Group';
import Expense from '../../src/models/Expense';
import Settlement from '../../src/models/Settlement';
import { DEFAULT_API_KEY } from '../../src/middleware/auth';

let mongoServer: MongoMemoryServer;

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

describe('Groups API Endpoints', () => {
  describe('Authentication on Write Endpoints', () => {
    it('should reject unauthenticated POST /groups with 401', async () => {
      const res = await request(app)
        .post('/groups')
        .send({
          name: 'Apartment 4B',
          members: ['Alice', 'Bob'],
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toContain('Unauthorized');
    });

    it('should reject invalid API key with 401', async () => {
      const res = await request(app)
        .post('/groups')
        .set('x-api-key', 'wrong-key')
        .send({
          name: 'Apartment 4B',
          members: ['Alice', 'Bob'],
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Unauthorized: Invalid API key');
    });
  });

  describe('POST /groups', () => {
    it('should create a new group with valid inputs and API key', async () => {
      const res = await request(app)
        .post('/groups')
        .set('x-api-key', DEFAULT_API_KEY)
        .send({
          name: 'Ski Trip',
          members: ['Alice', 'Bob', 'Charlie'],
        });

      expect(res.statusCode).toBe(201);
      expect(res.body._id).toBeDefined();
      expect(res.body.name).toBe('Ski Trip');
      expect(res.body.members).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('should return 400 if name is missing', async () => {
      const res = await request(app)
        .post('/groups')
        .set('x-api-key', DEFAULT_API_KEY)
        .send({
          members: ['Alice', 'Bob'],
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Group name is required');
    });

    it('should return 400 if members array is empty', async () => {
      const res = await request(app)
        .post('/groups')
        .set('x-api-key', DEFAULT_API_KEY)
        .send({
          name: 'Empty Group',
          members: [],
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Group must have at least one member');
    });
  });

  describe('GET /groups/:id', () => {
    it('should fetch an existing group by ID without auth header (Public Read)', async () => {
      const group = await Group.create({
        name: 'Road Trip',
        members: ['Alice', 'Bob'],
      });

      const res = await request(app).get(`/groups/${group._id}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('Road Trip');
      expect(res.body.members).toEqual(['Alice', 'Bob']);
    });

    it('should return 400 for invalid ObjectId format', async () => {
      const res = await request(app).get('/groups/invalid-id-123');

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Invalid group ID format');
    });

    it('should return 404 if group is not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/groups/${fakeId}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Group not found');
    });
  });

  describe('POST /groups/:id/expenses', () => {
    let groupInstance: InstanceType<typeof Group>;

    beforeEach(async () => {
      groupInstance = await Group.create({
        name: 'Dinner Club',
        members: ['Alice', 'Bob', 'Charlie'],
      });
    });

    it('should create an expense for a valid group with API key', async () => {
      const res = await request(app)
        .post(`/groups/${groupInstance._id}/expenses`)
        .set('x-api-key', DEFAULT_API_KEY)
        .send({
          paidBy: 'Alice',
          amount: 3000,
          description: 'Italian Dinner',
          splitBetween: ['Alice', 'Bob', 'Charlie'],
        });

      expect(res.statusCode).toBe(201);
      expect(res.body._id).toBeDefined();
      expect(res.body.paidBy).toBe('Alice');
      expect(res.body.amount).toBe(3000);
      expect(res.body.description).toBe('Italian Dinner');
    });

    it('should return 400 if payer is not a group member', async () => {
      const res = await request(app)
        .post(`/groups/${groupInstance._id}/expenses`)
        .set('x-api-key', DEFAULT_API_KEY)
        .send({
          paidBy: 'Dave',
          amount: 2000,
          description: 'Drinks',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain(
        "Payer 'Dave' is not a member of this group"
      );
    });

    it('should return 400 if amount is non-integer or <= 0', async () => {
      const floatRes = await request(app)
        .post(`/groups/${groupInstance._id}/expenses`)
        .set('x-api-key', DEFAULT_API_KEY)
        .send({
          paidBy: 'Alice',
          amount: 15.75,
          description: 'Float test',
        });

      expect(floatRes.statusCode).toBe(400);

      const negativeRes = await request(app)
        .post(`/groups/${groupInstance._id}/expenses`)
        .set('x-api-key', DEFAULT_API_KEY)
        .send({
          paidBy: 'Alice',
          amount: -500,
          description: 'Negative test',
        });

      expect(negativeRes.statusCode).toBe(400);
    });

    it('should return 404 if group does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/groups/${fakeId}/expenses`)
        .set('x-api-key', DEFAULT_API_KEY)
        .send({
          paidBy: 'Alice',
          amount: 1000,
          description: 'Orphan Expense',
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Group not found');
    });
  });

  describe('GET /groups/:id/expenses', () => {
    it('should list all expenses for a group (Public Read)', async () => {
      const group = await Group.create({
        name: 'Weekend Getaway',
        members: ['Alice', 'Bob'],
      });

      await Expense.create({
        groupId: group._id,
        paidBy: 'Alice',
        amount: 2000,
        description: 'Gas',
      });

      await Expense.create({
        groupId: group._id,
        paidBy: 'Bob',
        amount: 4000,
        description: 'Hotel',
      });

      const res = await request(app).get(`/groups/${group._id}/expenses`);

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0].description).toBe('Gas');
      expect(res.body[1].description).toBe('Hotel');
    });

    it('should return 404 if group does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/groups/${fakeId}/expenses`);

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Group not found');
    });
  });

  describe('GET /groups/:id/balances', () => {
    it('should return calculated net balances for all group members (Public Read)', async () => {
      const group = await Group.create({
        name: 'Shared Flat',
        members: ['Alice', 'Bob', 'Charlie'],
      });

      await Expense.create({
        groupId: group._id,
        paidBy: 'Alice',
        amount: 3000,
        description: 'Groceries',
        splitBetween: ['Alice', 'Bob', 'Charlie'],
      });

      const res = await request(app).get(`/groups/${group._id}/balances`);

      expect(res.statusCode).toBe(200);
      expect(res.body.groupId).toBe(group._id.toString());
      expect(res.body.balances).toEqual({
        Alice: 2000,
        Bob: -1000,
        Charlie: -1000,
      });
    });

    it('should return 404 if group does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/groups/${fakeId}/balances`);

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Group not found');
    });
  });

  describe('GET /groups/:id/settlements/suggested', () => {
    it('should return simplified debt transactions for group (Public Read)', async () => {
      const group = await Group.create({
        name: 'Vacation',
        members: ['Alice', 'Bob', 'Charlie'],
      });

      await Expense.create({
        groupId: group._id,
        paidBy: 'Alice',
        amount: 3000,
        description: 'Flight',
        splitBetween: ['Alice', 'Bob', 'Charlie'],
      });

      const res = await request(app).get(
        `/groups/${group._id}/settlements/suggested`
      );

      expect(res.statusCode).toBe(200);
      expect(res.body.groupId).toBe(group._id.toString());
      expect(res.body.settlements).toEqual([
        { from: 'Bob', to: 'Alice', amount: 1000 },
        { from: 'Charlie', to: 'Alice', amount: 1000 },
      ]);
    });

    it('should return 404 if group does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(
        `/groups/${fakeId}/settlements/suggested`
      );

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Group not found');
    });
  });

  describe('POST /groups/:id/settlements', () => {
    let groupInstance: InstanceType<typeof Group>;

    beforeEach(async () => {
      groupInstance = await Group.create({
        name: 'Camping Trip',
        members: ['Alice', 'Bob'],
      });
    });

    it('should record a settlement with API key and update balances', async () => {
      await Expense.create({
        groupId: groupInstance._id,
        paidBy: 'Alice',
        amount: 2000,
        description: 'Tent rental',
        splitBetween: ['Alice', 'Bob'],
      });

      const setRes = await request(app)
        .post(`/groups/${groupInstance._id}/settlements`)
        .set('x-api-key', DEFAULT_API_KEY)
        .send({
          from: 'Bob',
          to: 'Alice',
          amount: 1000,
        });

      expect(setRes.statusCode).toBe(201);
      expect(setRes.body._id).toBeDefined();
      expect(setRes.body.from).toBe('Bob');
      expect(setRes.body.to).toBe('Alice');
      expect(setRes.body.amount).toBe(1000);

      const balRes = await request(app).get(
        `/groups/${groupInstance._id}/balances`
      );
      expect(balRes.statusCode).toBe(200);
      expect(balRes.body.balances).toEqual({
        Alice: 0,
        Bob: 0,
      });
    });

    it('should return 400 if from and to are the same person', async () => {
      const res = await request(app)
        .post(`/groups/${groupInstance._id}/settlements`)
        .set('x-api-key', DEFAULT_API_KEY)
        .send({
          from: 'Bob',
          to: 'Bob',
          amount: 500,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("'from' and 'to' members cannot be the same");
    });

    it('should return 400 if member in settlement is not in group', async () => {
      const res = await request(app)
        .post(`/groups/${groupInstance._id}/settlements`)
        .set('x-api-key', DEFAULT_API_KEY)
        .send({
          from: 'Dave',
          to: 'Alice',
          amount: 500,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain(
        "Member 'Dave' is not a member of this group"
      );
    });
  });
});
