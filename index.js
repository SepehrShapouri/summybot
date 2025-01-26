require('dotenv').config();
const { App } = require('@slack/bolt');
const winston = require('winston');
const config = require('./src/config');
const commandHandlers = require('./src/handlers/commands');

// Configure Winston logger
const logger = winston.createLogger({
level: 'info',
format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
),
transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
    format: winston.format.simple()
    })
]
});

// Initialize the Slack app with config
const app = new App({
token: config.SLACK_BOT_TOKEN,
signingSecret: config.SLACK_SIGNING_SECRET,
socketMode: true,
appToken: config.SLACK_APP_TOKEN,
customRoutes: [
    {
    path: '/health',
    method: ['GET'],
    handler: (req, res) => {
        res.writeHead(200);
        res.end('Health check OK');
    },
    },
],
});

// Register the summarize command handler
app.command('/summarize', async ({ command, ack, say, client, logger }) => {
try {
    await ack();
    await commandHandlers.handleSummarizeCommand({ command, say, client, logger });
} catch (error) {
    logger.error('Error handling /summarize command:', error);
    await say({
    text: 'Sorry, something went wrong while processing your command.',
    thread_ts: command.thread_ts
    });
}
});

// Start the app
(async () => {
try {
    const port = config.PORT || 3000;
    await app.start(port);
    logger.info(`⚡️ Slack bot is running on port ${port}`);
} catch (error) {
    logger.error('Error starting app:', error);
    process.exit(1);
}
})();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
logger.info('SIGTERM received. Shutting down gracefully...');
await app.stop();
process.exit(0);
});
