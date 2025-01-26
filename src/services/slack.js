const NodeCache = require('node-cache');
const logger = require('../utils/logger');
const messageCache = new NodeCache();

class SlackService {
constructor(app) {
    this.app = app;
}

/**
* Fetch messages from a channel with caching
* @param {string} channelId - The channel ID to fetch messages from
* @param {number} oldest - Timestamp to fetch messages from
* @returns {Promise<Array>} Array of messages
*/
async fetchChannelMessages(channelId, oldest) {
    const cacheKey = `messages-${channelId}-${oldest}`;
    const cached = messageCache.get(cacheKey);
    
    if (cached) {
    return cached;
    }

    try {
    const result = await this.app.client.conversations.history({
        channel: channelId,
        oldest: oldest,
        limit: 100
    });

    messageCache.set(cacheKey, result.messages, 300); // Cache for 5 minutes
    return result.messages;
    } catch (error) {
    logger.error('Error fetching channel messages', { error: error.message, channelId });
    throw error;
    }
}

/**
* Post a message to a channel
* @param {string} channelId - The channel ID to post to
* @param {string} text - The message text
* @param {Object} blocks - Optional blocks for rich formatting
*/
async postMessage(channelId, text, blocks = null) {
    try {
    await this.app.client.chat.postMessage({
        channel: channelId,
        text,
        blocks
    });
    } catch (error) {
    logger.error('Error posting message', { error: error.message, channelId });
    throw error;
    }
}
}

module.exports = SlackService;

