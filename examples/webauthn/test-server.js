const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const simpleAuth = require('../../index');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

const config = {
  sessionSecret: process.env.SECRET_KEY || 'test-secret-key-change-in-production',

  database: {
    type: 'mongodb',
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/simpleauth_test',
    autoSync: true,
  },

  security: {
    enableHelmet: true,
    enableCsrf: false,
    enableRateLimiting: true,
  },

  email: {
    host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.EMAIL_PORT) || 2525,
    secure: false,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
};

async function startServer() {
  try {
    // a simple function call to set up authentication and all related routes/middleware
    await simpleAuth(app, config);

    app.use(express.static(path.join(__dirname)));

    app.get('/test', (req, res) => {
      res.sendFile(path.join(__dirname, 'complete-test.html'));
    });

    app.get('/webauthn-test', (req, res) => {
      res.sendFile(path.join(__dirname, 'webauthn-client.example.html'));
    });

    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString()
      });
    });

    app.listen(PORT, () => {
      console.log(`Test server running on http://localhost:${PORT}`);
      console.log('');
      console.log('Web Interfaces:');
      console.log(`  Complete Test Suite: http://localhost:${PORT}/test`);
      console.log(`  WebAuthn Only: http://localhost:${PORT}/webauthn-test`);
      console.log(`  Health Check: http://localhost:${PORT}/health`);
      console.log('');
      console.log('API Endpoints:');

      const routes = [];

      function extractRoutes(stack, prefix = '') {
        stack.forEach(middleware => {
          if (middleware.route) {
            const methods = Object.keys(middleware.route.methods)
              .map(m => m.toUpperCase())
              .join(', ');
            routes.push({
              method: methods,
              path: prefix + middleware.route.path
            });
          } else if (middleware.name === 'router' && middleware.handle.stack) {
            const routerPath = middleware.regexp
              .toString()
              .replace('/^\\', '')
              .replace('\\/?(?=\\/|$)/i', '')
              .replace(/\\\//g, '/');

            const cleanPath = routerPath.split('?')[0];
            extractRoutes(middleware.handle.stack, cleanPath);
          }
        });
      }

      extractRoutes(app._router.stack);

      routes
        .filter(r => r.path !== '*')
        .sort((a, b) => a.path.localeCompare(b.path))
        .forEach(route => {
          console.log(`  ${route.method.padEnd(6)} ${route.path}`);
        });
    });

  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
