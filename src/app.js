const express = require('express');
const cors = require('cors');
const healthRouter = require('./routes/health');
const groupsRouter = require('./routes/groups');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/health', healthRouter);
app.use('/groups', groupsRouter);

module.exports = app;
