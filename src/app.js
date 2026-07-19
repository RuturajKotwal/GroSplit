const express = require('express');
const cors = require('cors');
const healthRouter = require('./routes/health');
const groupsRouter = require('./routes/groups');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/health', healthRouter);
app.use('/groups', groupsRouter);

// Global Error Handler Middleware
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  const status = err.status || 500;
  return res.status(status).json({
    error: err.message || 'Internal Server Error',
  });
});

module.exports = app;
