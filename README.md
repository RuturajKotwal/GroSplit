# GroSplit — Shared Expense Splitter API

GroSplit is a Node.js / Express backend service for tracking multi-bill group expenses, calculating exact zero-sum net balances, and generating minimal debt settlement transactions.

## Deployments

- **Frontend Client**: [https://ruturajkotwal.github.io/GroSplit/](https://ruturajkotwal.github.io/GroSplit/)
- **Production API**: [https://grosplit.onrender.com](https://grosplit.onrender.com)
- **Interactive API Documentation (Swagger)**: [https://grosplit.onrender.com/api-docs](https://grosplit.onrender.com/api-docs)
- **Health Check**: [https://grosplit.onrender.com/health](https://grosplit.onrender.com/health)

---

## Technical Overview

GroSplit evolved from a single-bill static in-browser calculation script into a multi-tenant TypeScript REST API with cloud database persistence, Docker containerization, unit/integration testing, and automated CI.

Key technical specifications:
- **Integer Cents Precision**: All monetary values are handled in integer cents to eliminate floating-point rounding errors.
- **Deterministic Cent Allocation**: Remainder cents from non-even splits are assigned deterministically (alphabetically) to guarantee zero-sum group balance invariants.
- **Minimal Debt Graph Reduction**: Implements a greedy debt simplification algorithm to reduce $N$-person settlement transactions to at most $N-1$.
- **Production Hardening**: API key authentication and IP rate limiting on write endpoints.

---

## Architecture & Tech Stack

- **Runtime & Server**: Node.js 20, TypeScript, Express
- **Database & ODM**: MongoDB, Mongoose (MongoDB Atlas)
- **Security & Reliability**: `express-rate-limit`, Header-based API key auth
- **Testing**: Jest, `ts-jest`, Supertest, `mongodb-memory-server`
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

# Run development server with ts-node
npm run dev

# Or compile and run production bundle
npm run build
npm start
```

---

## Environment Configuration

Copy `.env.example` to `.env` to configure server properties:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `5000` | HTTP server port |
| `MONGODB_URI` | `mongodb://localhost:27017/grosplit` | Primary MongoDB connection URI |
| `MONGO_URI` | `mongodb://localhost:27017/grosplit` | Secondary fallback MongoDB connection URI |
| `API_KEY` | `grosplit-dev-secret-key` | Secret key required for write operations (`POST`) |

---

## Authentication & Rate Limiting

### Authentication
- **Read Operations (`GET`)**: Publicly accessible without credentials to enable frictionless viewing of balances and debt settlements.
- **Write Operations (`POST`)**: Protected via API key authentication. Clients must provide the key via either:
  - Header: `x-api-key: <API_KEY>`
  - Header: `Authorization: Bearer <API_KEY>`
- Unauthenticated or invalid requests return `401 Unauthorized`:
  ```json
  { "error": "Unauthorized: Missing API key in x-api-key or Authorization header" }
  ```

### Rate Limiting
- Write endpoints are guarded by `express-rate-limit` to prevent denial-of-service and automated spam.
- Returns standard `RateLimit-*` response headers.
- Requests exceeding thresholds return `429 Too Many Requests`:
  ```json
  { "error": "Too many requests, please try again later." }
  ```

---

## API Specification

All request and response bodies use JSON. Monetary amounts are integer cents (e.g., `2000` = €20.00).

| Method | Endpoint | Auth Required | Description | Status Codes |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | No | Server health & database connection status | `200` |
| `POST` | `/groups` | **Yes** | Create group `{ name, members }` | `201` / `400` / `401` / `429` |
| `GET` | `/groups/:id` | No | Retrieve group details | `200` / `404` |
| `POST` | `/groups/:id/expenses` | **Yes** | Record expense `{ paidBy, amount, description, splitBetween? }` | `201` / `400` / `401` / `429` |
| `GET` | `/groups/:id/expenses` | No | List group expenses | `200` / `404` |
| `GET` | `/groups/:id/balances` | No | Calculate net balances per member | `200` / `404` |
| `GET` | `/groups/:id/settlements/suggested` | No | Calculate minimal debt simplification list | `200` / `404` |
| `POST` | `/groups/:id/settlements` | **Yes** | Record repayment transaction `{ from, to, amount }` | `201` / `400` / `401` / `429` |

### Payload Examples

#### Create Group (`POST /groups`)
```json
// Headers: { "x-api-key": "grosplit-dev-secret-key" }
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
// Headers: { "x-api-key": "grosplit-dev-secret-key" }
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

Core calculations are isolated as pure functions in [`src/services/balanceService.ts`](file:///c:/Users/admin/OneDrive/Desktop/git/GroSplit/src/services/balanceService.ts).

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

# Run TypeScript typecheck
npm run typecheck

# Run ESLint check
npm run lint
```

### Coverage Statistics
- **Backend Test Count**: 71 passing tests across 8 test suites
- **React Component Test Count**: 6 passing tests across 3 test suites
- **Coverage**: >90% across statements, lines, and branches

### Continuous Integration & Pipelines
CI/CD workflows are configured for both **GitHub Actions** and **GitLab CI**:
- **GitHub Actions** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)): Automates linting, TypeScript typechecking, test coverage reporting, and Docker image build steps on all pushes and pull requests to `main` and `master`.
- **GitLab CI** ([`.gitlab-ci.yml`](.gitlab-ci.yml)): Multi-stage pipeline defining `lint_and_typecheck`, `test` (backend coverage + React component tests), `build` (TypeScript backend + Vite client), and `package` (Docker-in-Docker container compilation).
