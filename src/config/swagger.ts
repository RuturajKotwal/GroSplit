import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'GroSplit REST API',
      version: '2.0.0',
      description:
        'TypeScript Express REST API for tracking group expenses, calculating zero-sum net balances, and simplifying debt settlements.',
      contact: {
        name: 'Ruturaj Kotwal',
        url: 'https://github.com/RuturajKotwal/GroSplit',
      },
    },
    servers: [
      {
        url: 'https://grosplit.onrender.com',
        description: 'Production Server (Render)',
      },
      {
        url: 'http://localhost:5000',
        description: 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'API Key header for write operations',
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'Bearer token authorization header for write operations',
        },
      },
      schemas: {
        Group: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '66bc1f77bcf86cd799439011' },
            name: { type: 'string', example: 'Apartment 4B' },
            members: {
              type: 'array',
              items: { type: 'string' },
              example: ['Alice', 'Bob', 'Charlie'],
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        GroupInput: {
          type: 'object',
          required: ['name', 'members'],
          properties: {
            name: { type: 'string', example: 'Apartment 4B' },
            members: {
              type: 'array',
              items: { type: 'string' },
              example: ['Alice', 'Bob', 'Charlie'],
            },
          },
        },
        Expense: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '66bc2a88bcf86cd799439022' },
            groupId: { type: 'string', example: '66bc1f77bcf86cd799439011' },
            paidBy: { type: 'string', example: 'Alice' },
            amount: {
              type: 'integer',
              description: 'Amount in cents (e.g. 3000 = €30.00)',
              example: 3000,
            },
            description: { type: 'string', example: 'Weekly Groceries' },
            splitBetween: {
              type: 'array',
              items: { type: 'string' },
              example: ['Alice', 'Bob', 'Charlie'],
            },
            date: { type: 'string', format: 'date-time' },
          },
        },
        ExpenseInput: {
          type: 'object',
          required: ['paidBy', 'amount', 'description'],
          properties: {
            paidBy: { type: 'string', example: 'Alice' },
            amount: {
              type: 'integer',
              description: 'Positive integer in cents',
              example: 3000,
            },
            description: { type: 'string', example: 'Weekly Groceries' },
            splitBetween: {
              type: 'array',
              items: { type: 'string' },
              example: ['Alice', 'Bob', 'Charlie'],
            },
          },
        },
        Settlement: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '66bc3c99bcf86cd799439033' },
            groupId: { type: 'string', example: '66bc1f77bcf86cd799439011' },
            from: { type: 'string', example: 'Bob' },
            to: { type: 'string', example: 'Alice' },
            amount: { type: 'integer', example: 1000 },
            date: { type: 'string', format: 'date-time' },
          },
        },
        SettlementInput: {
          type: 'object',
          required: ['from', 'to', 'amount'],
          properties: {
            from: { type: 'string', example: 'Bob' },
            to: { type: 'string', example: 'Alice' },
            amount: {
              type: 'integer',
              description: 'Positive integer in cents',
              example: 1000,
            },
          },
        },
        BalanceResponse: {
          type: 'object',
          properties: {
            groupId: { type: 'string', example: '66bc1f77bcf86cd799439011' },
            balances: {
              type: 'object',
              additionalProperties: { type: 'integer' },
              example: { Alice: 2000, Bob: -1000, Charlie: -1000 },
            },
          },
        },
        SuggestedSettlementsResponse: {
          type: 'object',
          properties: {
            groupId: { type: 'string', example: '66bc1f77bcf86cd799439011' },
            settlements: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  from: { type: 'string', example: 'Bob' },
                  to: { type: 'string', example: 'Alice' },
                  amount: { type: 'integer', example: 1000 },
                },
              },
            },
          },
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'OK' },
            database: { type: 'string', example: 'connected' },
            uptime: { type: 'integer', example: 120 },
            version: { type: 'string', example: '2.0.0' },
            environment: { type: 'string', example: 'production' },
            memory: {
              type: 'object',
              properties: {
                heapUsedMB: { type: 'number', example: 34.5 },
                heapTotalMB: { type: 'number', example: 52.1 },
                rssMB: { type: 'number', example: 78.4 },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Group not found' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './dist/routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
