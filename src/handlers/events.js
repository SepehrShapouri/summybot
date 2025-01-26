const logger = require('../utils/logger');

/**
* Handle app mention events
* @param {Object} param0 - Event parameters
* @param {Object} param0.event - Event details
* @param {Object} param0.say - Say function
*/
async function handleAppMention({ event, say }) {
try {
    await say({
    text: "👋 Need a summary? Use the `/summarize` command to get a weekly summary of this channel!",
    thread_ts: event.ts
    });
} catch (error) {
    logger.error('Error handling app mention', { error: error.message, event });
}
}

module.exports = {
handleAppMention
};

