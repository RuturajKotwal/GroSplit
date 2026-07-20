// Fallback entry point for hosting providers configured with start command 'node src/server.js'
const path = require('path');
require(path.join(__dirname, '../dist/server.js'));
