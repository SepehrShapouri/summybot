const { App, ExpressReceiver } = require('@slack/bolt');
const { storeInstallation, fetchInstallation, createTables } = require('./db');
const { WebClient } = require('@slack/web-api');
const { OpenAI } = require('openai');
const express = require('express');
require('dotenv').config();

// Initialize database
createTables().catch(console.error);

// Create the receiver
// Create the receiver with OAuth settings
const receiver = new ExpressReceiver({
signingSecret: process.env.SLACK_SIGNING_SECRET,
clientId: process.env.SLACK_CLIENT_ID,
clientSecret: process.env.SLACK_CLIENT_SECRET,
stateSecret: process.env.SLACK_STATE_SECRET,
scopes: ['commands', 'channels:history', 'users:read', 'chat:write'],
installationStore: {
    storeInstallation,
    fetchInstallation,
},
processBeforeResponse: true
});

const app = new App({
receiver,
signingSecret: process.env.SLACK_SIGNING_SECRET,
clientId: process.env.SLACK_CLIENT_ID,
clientSecret: process.env.SLACK_CLIENT_SECRET,
stateSecret: process.env.SLACK_STATE_SECRET,
scopes: ['commands', 'channels:history', 'users:read', 'chat:write'],
installationStore: {
    storeInstallation,
    fetchInstallation
}
});
// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Middleware
receiver.router.use(express.json());

// Add logging middleware
receiver.router.use((req, res, next) => {
console.log('Incoming request:', {
    method: req.method,
    path: req.path,
    body: req.body
});
next();
});

// Command listener with logging
app.command('/summarize', async ({ command, ack, respond }) => {
console.log("Summarize command called", command);
try {
    await ack();
    
    const installation = await fetchInstallation(command.team_id);
    console.log('Found installation:', installation);
    
    if (!installation) {
    throw new Error('Workspace not installed properly');
    }
    
    const teamClient = new WebClient(installation.bot.token);

    // Post initial message
    const processingMsg = await teamClient.chat.postMessage({
    channel: command.channel_id,
    text: ":hourglass_flowing_sand: Gathering weekly messages..."
    });

    // Fetch channel history
    const oneWeekAgo = Math.floor(Date.now() / 1000) - 604800;
    const history = await teamClient.conversations.history({
    channel: command.channel_id,
    oldest: oneWeekAgo.toString(),
    limit: 1000
    });

    // Process messages
    const messages = history.messages
    .filter(msg => msg.type === 'message' && !msg.subtype && msg.text)
    .map(msg => `[${new Date(parseInt(msg.ts) * 1000).toLocaleDateString()}] ${msg.text}`)
    .join('\n');

    if (!messages) {
    await teamClient.chat.update({
        channel: command.channel_id,
        ts: processingMsg.ts,
        text: "No messages found this week."
    });
    return;
    }

    // Generate summary
    const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{
        role: "user",
        content: `Create a concise weekly summary from these messages. Focus on key points and decisions. Format in bullet points:\n\n${messages}`
    }]
    });

    // Post final summary
    await teamClient.chat.update({
    channel: command.channel_id,
    ts: processingMsg.ts,
    text: `*Weekly Summary for <#${command.channel_id}>:*\n${completion.choices[0].message.content}`
    });

} catch (error) {
    console.error('Detailed command error:', {
    error: error,
    stack: error.stack,
    command: command
    });
    await respond({
    response_type: 'ephemeral',
    text: `:warning: Error: ${error.message}`
    });
}
});

// Error handling middleware (should be last)
receiver.router.use((err, req, res, next) => {
console.error('Express error:', err);
res.status(500).send('Internal Server Error');
});

// OAuth success handler
receiver.router.get('/slack/oauth_redirect', async (req, res) => {
try {
    const installation = await receiver.installer.handleCallback(req, res);
    res.send('App installed successfully! You can close this window.');
} catch (error) {
    console.error('OAuth error:', error);
    res.status(500).send('OAuth error: ' + error.message);
}
});

// Home page with install button
receiver.router.get('/', (_req, res) => {
res.send(`<a href="https://slack.com/oauth/v2/authorize?client_id=${process.env.SLACK_CLIENT_ID}&scope=${process.env.SCOPES}&redirect_uri=${process.env.SLACK_REDIRECT_URI}"><img alt=""Add to Slack"" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" /></a>`);
});

// Start server
const port = process.env.PORT || 3000;
(async () => {
try {
    await app.start(port);
    console.log(`⚡ Slack app running on port ${port}`);
} catch (error) {
    console.error('Failed to start app:', error);
    process.exit(1);
}
})();
