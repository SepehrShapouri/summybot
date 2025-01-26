require('dotenv').config();
const { App } = require('@slack/bolt');
const winston = require('winston');
const config = require('./config');
const commandHandlers = require('./handlers/commands');

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
token: "xoxb-7911827745026-8351023238450-29tIegc8EWC2uWErJRutQju1",
signingSecret: "1bc2160e80f45db7590da08e1ee4e341",
socketMode: true,
appToken:"xapp-1-A08A4BT35QW-8363721635825-042a4aeb96b4214de91d1f5ed861024d6cbc713c189f09bcb81d80a84ff3be3a",
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
