const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

router.get('/', async (req, res) => {
  let isDbConnected = mongoose.connection.readyState === 1;
  let dbError = null;

  if (!isDbConnected) {
    const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (MONGO_URI) {
      try {
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        isDbConnected = mongoose.connection.readyState === 1;
      } catch (err) {
        dbError = err.message;
      }
    } else {
      dbError =
        'Neither MONGO_URI nor MONGODB_URI environment variable is set on the server.';
    }
  }

  const responsePayload = {
    status: 'OK',
    database: isDbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  };

  if (dbError) {
    responsePayload.dbError = dbError;
  }

  res.status(200).json(responsePayload);
});

module.exports = router;
