const { App } = require('@slack/bolt');
const { storeInstallation, fetchInstallation, createTables } = require('./db');
require('dotenv').config();

// Initialize database
createTables().catch(console.error);

const app = new App({
signingSecret: process.env.SLACK_SIGNING_SECRET,
clientId: process.env.SLACK_CLIENT_ID,
clientSecret: process.env.SLACK_CLIENT_SECRET,
stateSecret: process.env.SLACK_STATE_SECRET,
scopes: ['commands', 'channels:history', 'users:read', 'chat:write'],
socketMode: true,
appToken: process.env.SLACK_APP_TOKEN,
installationStore: {
    storeInstallation,
    fetchInstallation,
},
});

// Import routes
require('./routes/commands')(app);

// Start app
(async () => {
await app.start();
console.log('⚡️ Bolt app is running!');
})();
