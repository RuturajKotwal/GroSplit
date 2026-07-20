# GroSplit — Shared Expense Splitter API

GroSplit is a Node.js / Express backend service for tracking multi-bill group expenses, calculating exact zero-sum net balances, and generating minimal debt settlement transactions.

## Deployments

- **Frontend Client**: [https://ruturajkotwal.github.io/GroSplit/](https://ruturajkotwal.github.io/GroSplit/)
- **Production API**: [https://grosplit.onrender.com](https://grosplit.onrender.com)
- **Health Check**: [https://grosplit.onrender.com/health](https://grosplit.onrender.com/health)

---

## Technical Overview

GroSplit evolved from a single-bill static in-browser calculation script into a multi-tenant REST API with cloud database persistence, Docker containerization, unit/integration testing, and automated CI.

Key technical specifications:
- **Integer Cents Precision**: All monetary values are handled in integer cents to eliminate floating-point rounding errors.
- **Deterministic Cent Allocation**: Remainder cents from non-even splits are assigned deterministically (alphabetically) to guarantee zero-sum group balance invariants.
- **Minimal Debt Graph Reduction**: Implements a greedy debt simplification algorithm to reduce $N$-person settlement transactions to at most $N-1$.

---

## Architecture & Tech Stack

- **Runtime & Server**: Node.js 20, Express
- **Database & ODM**: MongoDB, Mongoose (MongoDB Atlas)
- **Testing**: Jest, Supertest, `mongodb-memory-server`
- **Containerization**: Docker, Docker Compose
- **CI/CD**: GitHub Actions
- **Client**: Vanilla HTML5, CSS3, JavaScript (Fetch API)

---

## Setup & Execution

### Prerequisites
- Node.js 20+
- MongoDB (or Docker Desktop)

### Option 1: Docker Compose

```bash
# Clone the repository
git clone https://github.com/RuturajKotwal/GroSplit.git
cd GroSplit

# Start Express API and MongoDB services
docker-compose up --build
```
The API listens at `http://localhost:5000`.

### Option 2: Local Node.js Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Run development server
npm run dev
```

---

## Environment Configuration

Copy `.env.example` to `.env` to configure server properties:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `5000` | HTTP server port |
| `MONGODB_URI` | `mongodb://localhost:27017/grosplit` | Primary MongoDB connection URI |
| `MONGO_URI` | `mongodb://localhost:27017/grosplit` | Secondary fallback MongoDB connection URI |

---

## API Specification

All request and response bodies use JSON. Monetary amounts are integer cents (e.g., `2000` = €20.00).

| Method | Endpoint | Description | Status |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Server health & database connection status | `200` |
| `POST` | `/groups` | Create group `{ name, members }` | `201` / `400` |
| `GET` | `/groups/:id` | Retrieve group details | `200` / `404` |
| `POST` | `/groups/:id/expenses` | Record expense `{ paidBy, amount, description, splitBetween? }` | `201` / `400` |
| `GET` | `/groups/:id/expenses` | List group expenses | `200` / `404` |
| `GET` | `/groups/:id/balances` | Calculate net balances per member | `200` / `404` |
| `GET` | `/groups/:id/settlements/suggested` | Calculate minimal debt simplification list | `200` / `404` |
| `POST` | `/groups/:id/settlements` | Record repayment transaction `{ from, to, amount }` | `201` / `400` |

### Payload Examples

#### Create Group (`POST /groups`)
```json
// Request
{
  "name": "Apartment 4B",
  "members": ["Alice", "Bob", "Charlie"]
}

// Response (201 Created)
{
  "_id": "66bc1f77bcf86cd799439011",
  "name": "Apartment 4B",
  "members": ["Alice", "Bob", "Charlie"],
  "createdAt": "2026-08-15T09:00:00.000Z"
}
```

#### Add Expense (`POST /groups/:id/expenses`)
```json
// Request
{
  "paidBy": "Alice",
  "amount": 3000,
  "description": "Weekly Groceries",
  "splitBetween": ["Alice", "Bob", "Charlie"]
}
```

#### Calculate Net Balances (`GET /groups/:id/balances`)
```json
// Response (200 OK)
{
  "groupId": "66bc1f77bcf86cd799439011",
  "balances": {
    "Alice": 2000,
    "Bob": -1000,
    "Charlie": -1000
  }
}
```

#### Get Suggested Settlements (`GET /groups/:id/settlements/suggested`)
```json
// Response (200 OK)
{
  "groupId": "66bc1f77bcf86cd799439011",
  "settlements": [
    { "from": "Bob", "to": "Alice", "amount": 1000 },
    { "from": "Charlie", "to": "Alice", "amount": 1000 }
  ]
}
```

---

## Core Algorithms

Core calculations are isolated as pure functions in [`src/services/balanceService.js`](file:///c:/Users/admin/OneDrive/Desktop/git/GroSplit/src/services/balanceService.js).

### 1. Net Balance Calculation (`calculateBalances`)
- **Integer Cents Math**: Prevents floating-point precision loss by working entirely in integer cents.
- **Deterministic Remainder Cent Distribution**: For non-divisible amounts (e.g., 1000 cents divided 3 ways = 333 cents with 1 remainder cent), remainder cents are allocated deterministically to participants ordered alphabetically. This enforces the invariant $\sum \text{balances} = 0$.
- **Settlement Adjustments**: Incorporates recorded repayments (`settlements`) to offset outstanding balances.

### 2. Debt Simplification (`simplifyDebts`)
Reduces multi-party debt transfers using a greedy matching algorithm:
1. Partitions group members into **Debtors** ($\text{balance} < 0$) and **Creditors** ($\text{balance} > 0$).
2. Sorts Debtors descending by debt magnitude and Creditors descending by credit magnitude.
3. Iteratively resolves $\min(\text{debt}, \text{credit})$ between the largest debtor and largest creditor until all balances are zeroed.

---

## Testing & CI

Unit and integration tests are built using Jest, Supertest, and `mongodb-memory-server`.

```bash
# Run unit and integration tests
npm test

# Generate code coverage report
npm run test:coverage

# Run ESLint check
npm run lint
```

### Coverage Statistics
- **Statement Coverage**: 94.53%
- **Line Coverage**: 95.25%
- **Function Coverage**: 100%
- **Test Count**: 61 passing tests across 5 test suites

### Continuous Integration
GitHub Actions runs `.github/workflows/ci.yml` on push and pull requests targeting `master` and `main` branches, verifying linting, test execution, coverage, and Docker build steps.
