const { App, ExpressReceiver } = require('@slack/bolt');
const { storeInstallation, fetchInstallation, createTables } = require('./db');
const express = require('express');
require('dotenv').config();

// Initialize database
createTables().catch(console.error);

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: process.env.SLACK_STATE_SECRET,
  scopes: ['commands', 'channels:history', 'users:read', 'chat:write'],
  installationStore: {
    storeInstallation,
    fetchInstallation
  },
});
const app = new App({ receiver });

// Middleware
receiver.router.use(express.json());
receiver.router.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Internal Server Error');
});

// Import routes
require('./routes/oauth')(receiver);
require('./routes/commands')(app);

// Start server
const port = process.env.PORT || 3000;
app.start(port).then(() => {
  console.log(`⚡ Slack app running on port ${port}`);
});