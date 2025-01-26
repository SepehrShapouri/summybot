const dotenv = require('dotenv');
const logger = require('./utils/logger');

dotenv.config();

const requiredEnvVars = [
'SLACK_BOT_TOKEN',
'SLACK_SIGNING_SECRET',
'OPENAI_API_KEY',
'PORT'
];

// Validate environment variables
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
logger.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
process.exit(1);
}

module.exports = {
port: process.env.PORT || 3000,
slack: {
    botToken: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    appToken:process.env.SLACK_APP_TOKEN,
    rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
    }
},
openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-3.5-turbo',
    maxTokens: 500,
    temperature: 0.7,
    cacheExpiry: 60 * 60 // 1 hour
}
};

