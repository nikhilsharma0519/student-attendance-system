const path = require('path');
const fs = require('fs');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const config = require('./config');
const store = require('./utils/jsonStore');
const routes = require('./routes');
const { seedIfNeeded } = require('./seed');
const { notFound, errorHandler } = require('./middleware/errorHandler');

async function createApp() {
  // 1. make sure folders and JSON files exist (never overwrites existing data)
  await store.ensureFiles();
  // 2. first run only: generate dummy data (a marker file prevents repeating it)
  await seedIfNeeded();

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use((req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); next(); });

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api', routes);
  // NOTE: the data/ and uploads/ folders are NOT served statically. Files are only reachable via the checked API routes.

  // Optional single-server mode: after "npm run build" the React app in frontend/dist is served by Express too.
  const dist = path.join(__dirname, '..', 'frontend', 'dist');
  if (fs.existsSync(path.join(dist, 'index.html'))) {
    app.use(express.static(dist));
    app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

if (require.main === module) {
  createApp()
    .then((app) => {
      app.listen(config.port, () => {
        console.log(`Attendance API running on http://localhost:${config.port}`);
      });
    })
    .catch((err) => {
      console.error('Failed to start:', err.message);
      process.exit(1);
    });
}

module.exports = { createApp };
