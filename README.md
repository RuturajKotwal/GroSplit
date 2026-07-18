# GroSplit — Shared Expense Splitter API

> A defensible, production-grade Node.js / Express backend service for tracking multi-bill group expenses, calculating exact zero-sum net balances, and generating minimal debt simplification settlements.

---

## 📖 Background & Evolution (The "Before / After" Story)

* **Before**: GroSplit started as a single-bill static HTML/JS page created during Master's shared housing to split one-off grocery bills. It relied solely on in-memory browser state, had no database persistence, supported only single bills, and offered no debt simplification.
* **After**: Rebuilt into a multi-bill, persistent REST API powered by Node.js, Express, MongoDB (Mongoose), containerized with Docker & Docker Compose, thoroughly unit & integration tested with Jest (achieving **>94% statement coverage**), and automated via GitHub Actions CI.

---

## 🛠️ Tech Stack

* **Backend Framework**: Node.js, Express
* **Database & ODM**: MongoDB, Mongoose
* **Testing & Coverage**: Jest, Supertest, `mongodb-memory-server`
* **Containerization**: Docker, Docker Compose
* **CI/CD**: GitHub Actions
* **Frontend Client**: Vanilla HTML5, CSS3, JavaScript (Fetch API integration)

---

## 🚀 Quickstart Guide

### Option 1: Running with Docker Compose (Recommended)

Requires Docker Desktop installed.

```bash
# 1. Clone the repository
git clone https://github.com/RuturajKotwal/GroSplit.git
cd GroSplit

# 2. Start the full stack (Express API + MongoDB with persistent storage)
docker-compose up --build
```
The Express API will be live at `http://localhost:5000`.

### Option 2: Running Locally with Node.js & MongoDB

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables (create .env file)
cp .env.example .env

# 3. Start development server
npm run dev

# Or start production server
npm start
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` to configure local settings:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `5000` | Port for the Express API server |
| `MONGODB_URI` | `mongodb://localhost:27017/grosplit` | MongoDB database connection URI |

---

## 📑 API Endpoints Reference

All request/response payloads use JSON format. All monetary `amount` values are integers representing **cents** to prevent float precision errors (e.g. `2000` = €20.00).

| Method | Endpoint | Description | Status Code |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Server health check endpoint | `200 OK` |
| `POST` | `/groups` | Create a new group | `201 Created` |
| `GET` | `/groups/:id` | Fetch group details by ID | `200 OK` / `404` |
| `POST` | `/groups/:id/expenses` | Record a new expense | `201 Created` / `400` |
| `GET` | `/groups/:id/expenses` | List all expenses for a group | `200 OK` / `404` |
| `GET` | `/groups/:id/balances` | Calculate net balances per member | `200 OK` / `404` |
| `GET` | `/groups/:id/settlements/suggested` | Calculate simplified debt settlements | `200 OK` / `404` |
| `POST` | `/groups/:id/settlements` | Record a repayment settlement | `201 Created` / `400` |

### API Payload Examples

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

#### Get Net Balances (`GET /groups/:id/balances`)
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

#### Get Suggested Simplified Debts (`GET /groups/:id/settlements/suggested`)
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

## 🧮 Algorithm Deep Dive: Debt Simplification

GroSplit implements two pure, testable algorithms in [`src/services/balanceService.js`](file:///c:/Users/admin/OneDrive/Desktop/git/GroSplit/src/services/balanceService.js):

### 1. Balance Calculation (`calculateBalances`)
* **Exact Integer Cents**: Amounts are stored and processed in cents (`Math.floor`) to avoid floating-point inaccuracies.
* **Deterministic Remainder Assignment**: When an expense cannot be divided evenly into cents (e.g. €10.00 / 1000 cents split 3 ways = 333 cents per person with 1 remainder cent), the extra remainder cents are assigned deterministically based on alphabetical member name sorting. This guarantees net group balances always sum exactly to zero.
* **Custom Ratios & Settlements**: Supports optional weighted split ratios per participant (`shares`) and applies recorded repayments (`settlements`).

### 2. Greedy Debt Simplification (`simplifyDebts`)
Instead of making $N \times (N-1)$ individual transfers between members, `simplifyDebts` reduces total transactions to at most $N-1$:
1. Partition members into **Debtors** (net balance $< 0$) and **Creditors** (net balance $> 0$).
2. Sort Debtors descending by debt magnitude and Creditors descending by credit magnitude.
3. Greedily transfer $\min(\text{debt}, \text{credit})$ from the largest debtor to the largest creditor.
4. Advance pointers when balances hit 0 until all debts are resolved.

---

## 🧪 Testing & Code Coverage

The project maintains comprehensive unit and integration test suites powered by Jest and Supertest with `mongodb-memory-server`.

```bash
# Run all unit and integration tests
npm test

# Run tests with code coverage report
npm run test:coverage

# Run ESLint linter
npm run lint
```

### Coverage Metrics
* **Statement Coverage**: **94.53%**
* **Line Coverage**: **95.25%**
* **Function Coverage**: **100%**
* **Test Count**: **61 passing tests across 5 test suites**

---

## 🔄 Continuous Integration (CI)

GitHub Actions automatically runs `.github/workflows/ci.yml` on `push` and `pull_request` to `main`/`master`:
1. Checks out codebase (`actions/checkout@v4`).
2. Configures Node.js 20 environment with npm caching (`actions/setup-node@v4`).
3. Executes ESLint static check (`npm run lint`).
4. Executes unit and integration test suite with coverage (`npm run test:coverage`).
5. Validates production Docker image build (`docker/build-push-action@v5`).
