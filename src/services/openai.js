const OpenAI = require('openai');
const NodeCache = require('node-cache');
const config = require('../config');
const logger = require('../utils/logger');

const summaryCache = new NodeCache({ stdTTL: config.openai.cacheExpiry });

class OpenAIService {
constructor() {
    this.openai = new OpenAI({
        apiKey: config.openai.apiKey
    });
}

/**
* Generate a summary of messages using OpenAI
* @param {Array} messages - Array of messages to summarize
* @param {string} channelId - Channel ID for cache key
* @returns {Promise<string>} Generated summary
*/
async summarizeMessages(messages, channelId) {
    const cacheKey = `summary-${channelId}-${Date.now()}`;
    const cached = summaryCache.get(cacheKey);

    if (cached) {
    return cached;
    }

    const messageText = messages
    .map(m => `${m.user}: ${m.text}`)
    .join('\n');

    const prompt = `Please provide a concise weekly summary of the following Slack conversation in bullet points. Focus on key decisions, action items, and important discussions:\n\n${messageText}`;

    try {
    const completion = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: config.openai.maxTokens,
        temperature: config.openai.temperature,
    });

    const summary = completion.choices[0].message.content;
    summaryCache.set(cacheKey, summary);
    return summary;
    } catch (error) {
    logger.error('Error generating summary', { error: error.message });
    throw error;
    }
}
}

module.exports = OpenAIService;

