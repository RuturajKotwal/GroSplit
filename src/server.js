require('dotenv').config();
const app = require('./app');
const mongoose = require('mongoose');

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const startServer = async () => {
  try {
    if (MONGO_URI) {
      try {
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('Connected to MongoDB');
      } catch (dbErr) {
        console.warn(
          `Could not connect to MongoDB (${dbErr.message}); running server without active DB connection.`
        );
      }
    } else {
      console.warn(
        'MONGO_URI is not set; running server without DB connection.'
      );
    }

    const server = app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = startServer;
