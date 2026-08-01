const express = require('express');
const path = require('path');

function createApp(options = {}) {
  const app = express();
  const staticDirectory = options.staticDirectory || path.resolve(__dirname, '..', 'dist');

  app.disable('x-powered-by');
  app.get('/health', (_request, response) => {
    response.json({ status: 'healthy', service: 'algorithm-builder-app' });
  });
  app.use(express.static(staticDirectory));

  return app;
}

function startServer(options = {}) {
  const port = Number(options.port || process.env.PORT || 3000);
  const host = options.host || process.env.HOST || '127.0.0.1';
  const server = createApp(options).listen(port, host, () => {
    console.log(`Algorithm Builder server listening on http://${host}:${port}`);
  });
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { createApp, startServer };
