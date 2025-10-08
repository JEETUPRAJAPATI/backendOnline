const path = require('path');
const express = require('express');
const cors = require('./middlewares/cors.middleware'); // Import custom CORS middleware
const routes = require('./routes/index');
const errorHandler = require('./utils/errorHandler');
const {customMorganFormat} = require('./utils/generalUtils');
const morgan = require('morgan');
const helmet = require('helmet');

const app = express();
app.use(cors);

// Middleware to set a base URL
app.use((req, res, next) => {
  if(process.env.NODE_ENV == "production") {
    const fullBaseUrl = `https://${req.get('host')}`;
    req['appBaseUrl'] = fullBaseUrl;
  } else {
    const fullBaseUrl = `${req.protocol}://${req.get('host')}`;
    req['appBaseUrl'] = fullBaseUrl;
  }
  next();
});

// Serve static files from 'backend/public/uploads'
app.use('/uploads', express.static(global.uploadsBaseDir));

// Middleware to prevent directory traversal
const preventDirectoryTraversal = (req, res, next) => {
  const requestedPath = path.join(__dirname, 'public', 'uploads', req.params[0]);
  const uploadsDir = path.join(__dirname, 'public', 'uploads');

  if (!requestedPath.startsWith(uploadsDir)) {
    return res.status(403).send('Forbidden');
  }
  next();
};

// Route to serve files safely with directory traversal prevention
app.get('/uploads/*', preventDirectoryTraversal, (req, res) => {
  const filePath = path.join(__dirname, 'public', req.path);
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).send('File not found');
    }
  });
});

// Security and logging middleware
app.use(helmet());
app.use(express.json());
app.use(morgan(customMorganFormat));

// Middleware to prevent API response caching
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.set("Surrogate-Control", "no-store"); // Prevent caching from CDNs like Cloudflare
  next();
});

// Routes and error handler
app.use("/api", routes);

// Catch-all for undefined routes (404 errors)
app.use((req, res, next) => {
  const error = new Error(`Cannot ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
});

app.use(errorHandler);

module.exports = app;
