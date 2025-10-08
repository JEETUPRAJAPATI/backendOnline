const http = require('http');
const logger = require('./src/utils/loggerUtils'); // Import the logger utility
global.logger = logger;
require('dotenv').config();

const path = require('path');

// Set global uploads base directory
global.uploadsBaseDir = path.resolve(__dirname, './public/uploads');

const app = require('./src/main');
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});