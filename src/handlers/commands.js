// const logger = require('../utils/logger');
// const SlackService = require('../services/slack');
// const OpenAIService = require('../services/openai');
// const NodeCache = require('node-cache');

// const cache = new NodeCache();
// const openaiService = new OpenAIService();

// const RATE_LIMIT_DURATION = 3600; // 1 hour in seconds
// const OPENAI_TIMEOUT = 30000; // 30 seconds
// const MAX_RETRIES = 3;

// /**
// * Retry a function with exponential backoff
// * @param {Function} fn - Function to retry
// * @param {number} maxRetries - Maximum number of retries
// * @returns {Promise} - Promise that resolves with the function result
// */
// const withRetry = async (fn, maxRetries) => {
// let lastError;
// for (let attempt = 1; attempt <= maxRetries; attempt++) {
//     try {
//     return await fn();
//     } catch (error) {
//     lastError = error;
//     if (attempt === maxRetries) throw error;
//     await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
//     }
// }
// throw lastError;
// };

// /**
// * Get the timestamp for the start of the current week
// * @returns {number} Unix timestamp
// */
// const getStartOfWeekTimestamp = () => {
// const now = new Date();
// const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
// startOfWeek.setHours(0, 0, 0, 0);
// return startOfWeek.getTime() / 1000;
// };

// /**
// * Handle the /summarize command
// * @param {Object} param0 - Command parameters
// * @param {Object} param0.command - Command details
// * @param {Object} param0.ack - Acknowledgement function
// * @param {Object} param0.say - Say function
// */
// async function handleSummarizeCommand({ command, ack, client, respond }) {


//     logger.debug('Received summarize command', { channel: command.channel_id });
    
//     const cacheKey = `summarize:${command.channel_id}`;
    
//     // Check rate limit
//     if (cache.get(cacheKey)) {
//         await ack({
//             response_type: 'ephemeral',
//             text: "This channel was recently summarized. Please wait an hour between summaries."
//         });
//         return;
//     }
//         await ack({
//             response_type: 'ephemeral',
//             text: "This channel was recently summarized. Please wait an hour between summaries."
//         });
//         return;
//     }
    
//     // Acknowledge command received immediately
//     await ack();

//     // Initial response
//     await respond({
//         response_type: 'in_channel',
//         blocks: [
//             {
//                 type: 'section',
//                 text: {
//                     type: 'mrkdwn',
//                     text: 'Processing your request... :hourglass_flowing_sand:'
//                 }
//             }
//         ]
//     });

// try {
//     const slackService = new SlackService({ client });
//     let threadTs = null;
    
//     // Check cache first
//     const summaryCache = cache.get(cacheKey);
//     if (summaryCache) {
//         logger.debug('Using cached summary');
//         await sendFormattedResponse(respond, summaryCache);
//         return;
//     }
//     progress.startStage('initialization');
    
//     // Start a new thread with initial message
//     const initialResponse = await respond({
//         response_type: 'in_channel',
//         blocks: [{
//             type: 'section',
//             text: {
//                 type: 'mrkdwn',
//                 text: 'Starting weekly summary... (0%) :hourglass_flowing_sand:'
//             }
//         }]
//     });
//     threadTs = initialResponse.message_ts;
    
//     // Update progress (25%)
//     logger.debug('Fetching messages');
//     await respond({
//         replace_original: true,
//         blocks: [
//             {
//                 type: 'section',
//                 text: {
//                     type: 'mrkdwn',
//                     text: 'Fetching messages... (25%) :mag:'
//                 }
//             }
//         ]
//     });

//     // Fetch messages with retry mechanism
//     const messages = await withRetry(
//         () => slackService.fetchChannelMessages(
//             command.channel_id,
//             getStartOfWeekTimestamp()
//         ),
//         MAX_RETRIES
//     );

//     if (messages.length === 0) {
//         await respond({
//             replace_original: true,
//             blocks: [
//                 {
//                     type: 'section',
//                     text: {
//                         type: 'mrkdwn',
//                         text: 'No messages found from this week! :shrug:'
//                     }
//                 }
//             ]
//         });
//         return;
//     }

//     // Update progress for AI processing
//     await respond({
//         replace_original: true,
//         blocks: [
//             {
//                 type: 'section',
//                 text: {
//                     type: 'mrkdwn',
//                     text: 'Analyzing messages with AI... (50%) :thinking_face:'
//                 }
//             }
//         ]
//     });

//     // Generate summary with retry and timeout
//     const summary = await Promise.race([
//         withRetry(
//             () => openaiService.summarizeMessages(messages, command.channel_id),
//             MAX_RETRIES
//         ),
//         new Promise((_, reject) => 
//             setTimeout(() => reject(new Error('OpenAI timeout')), OPENAI_TIMEOUT)
//         )
//     ]);
//             ]);
//             break;
//         } catch (error) {
//             if (attempt === MAX_RETRIES) throw error;
//             logger.warn(`Summary generation attempt ${attempt} failed`, { error: error.message });
//             await respond({
//                 replace_original: false,
//                 thread_ts: threadTs,
//                 blocks: [{
//                     type: 'section',
//                     text: {
//                         type: 'mrkdwn',
//                         text: `Retry attempt ${attempt}/${MAX_RETRIES}... :repeat:`
//                     }
//                 }]
//             });
//             await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
//         }
//     }

//     // Cache the successful summary
//     cache.set(cacheKey, summary, RATE_LIMIT_DURATION);
//     // Calculate time range
//     const startTime = new Date(getStartOfWeekTimestamp() * 1000);
//     const endTime = new Date();
//     const timeRange = `${startTime.toLocaleDateString()} - ${endTime.toLocaleDateString()}`;

//     logger.debug('Sending final summary');
//     // Send final formatted response
//     await respond({
//         replace_original: true,
//         blocks: [
//             {
//                 type: 'header',
//                 text: {
//                     type: 'plain_text',
//                     text: '📋 Weekly Channel Summary',
//                     emoji: true
//                 }
//             },
//             {
//                 type: 'divider'
//             },
//             {
//                 type: 'section',
//                 text: {
//                     type: 'mrkdwn',
//                     text: summary
//                 }
//             },
//             {
//                 type: 'context',
//                 elements: [
//                     {
//                         type: 'mrkdwn',
//                         text: '_Summary generated using AI - results may vary_'
//                     },
//                     {
//                         type: 'mrkdwn',
//                         text: `*Time Range:* ${timeRange}`
//                     },
//                     {
//                         type: 'mrkdwn',
//                         text: `*Period:* Past week • *Messages analyzed:* ${messages.length}`
//                     }
//                 ]
//             }
//         ]
//     });

// } catch (error) {
//     logger.error('Error handling summarize command', { 
//         error: error.message, 
//         stack: error.stack,
//         command: command 
//     });

//     // Log the error with full details once
//     logger.error('Error handling summarize command', { error: error.message, channel: command.channel_id });
//     let errorMessage = 'Sorry, something went wrong while generating the summary \U0001F615';
    
//     if (error.code === 'CHANNEL_NOT_FOUND') {
//         errorMessage = "I don't have access to this channel. Please add me first! 🔒";
//     } else if (error.code === 'RATE_LIMITED') {
//         errorMessage = "I'm being rate limited. Please try again in a few minutes. ⏳";
//     }

//     await respond({
//         replace_original: true,
//         blocks: [
//             {
//                 type: 'section',
//                 text: {
//                     type: 'mrkdwn',
//                     text: errorMessage
//                 }
//             }
//         ]
//     });
// }


// module.exports = {
// handleSummarizeCommand
// };



const logger = require('../utils/logger');
const SlackService = require('../services/slack');
const OpenAIService = require('../services/openai');
const NodeCache = require('node-cache');

const cache = new NodeCache();
const openaiService = new OpenAIService();

const RATE_LIMIT_DURATION = 3600; // 1 hour in seconds
const OPENAI_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise} - Promise that resolves with the function result
 */
const withRetry = async (fn, maxRetries) => {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  throw lastError;
};

/**
 * Get the timestamp for the start of the current week
 * @returns {number} Unix timestamp
 */
const getStartOfWeekTimestamp = () => {
  const now = new Date();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  startOfWeek.setHours(0, 0, 0, 0);
  return Math.floor(startOfWeek.getTime() / 1000);
};

/**
 * Send a formatted response
 * @param {Function} respond - Respond function
 * @param {string} summary - Summary text
 * @param {number} startTime - Start time of the period
 * @param {number} messagesCount - Number of messages analyzed
 */
const sendFormattedResponse = async (respond, summary, startTime, messagesCount) => {
  const startDate = new Date(startTime * 1000).toLocaleDateString();
  const endDate = new Date().toLocaleDateString();
  await respond({
    replace_original: true,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📋 Weekly Channel Summary',
          emoji: true
        }
      },
      {
        type: 'divider'
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: summary
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '_Summary generated using AI - results may vary_'
          },
          {
            type: 'mrkdwn',
            text: `*Time Range:* ${startDate} - ${endDate}`
          },
          {
            type: 'mrkdwn',
            text: `*Messages Analyzed:* ${messagesCount}`
          }
        ]
      }
    ]
  });
};

/**
 * Handle the /summarize command
 * @param {Object} params - Command parameters
 * @param {Object} params.command - Command details
 * @param {Object} params.ack - Acknowledgement function
 * @param {Object} params.respond - Respond function
 * @param {Object} params.client - Slack client
 */
const handleSummarizeCommand = async ({ command, ack, respond, client }) => {
  logger.debug('Received summarize command', { channel: command.channel_id });

  const cacheKey = `summarize:${command.channel_id}`;
  const startOfWeekTimestamp = getStartOfWeekTimestamp();

  // Check rate limit
  if (cache.get(cacheKey)) {
    await ack();
    await respond({
      response_type: 'ephemeral',
      text: "This channel was recently summarized. Please wait an hour between summaries."
    });
    return;
  }

  // Acknowledge command
  await ack();

  // Notify user that processing has started
  const initialResponse = await respond({
    response_type: 'in_channel',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Processing your request... :hourglass_flowing_sand:'
        }
      }
    ]
  });

  const threadTs = initialResponse.ts;

  try {
    const slackService = new SlackService({ client });

    // Fetch messages with retry
    const messages = await withRetry(() =>
      slackService.fetchChannelMessages(command.channel_id, startOfWeekTimestamp),
      MAX_RETRIES
    );

    if (messages.length === 0) {
      await respond({
        replace_original: true,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: 'No messages found from this week! :shrug:'
            }
          }
        ]
      });
      return;
    }

    // Notify user about AI processing
    await respond({
      replace_original: true,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Analyzing messages with AI... :thinking_face:'
          }
        }
      ]
    });

    // Generate summary with retry and timeout
    const summary = await Promise.race([
      withRetry(() => openaiService.summarizeMessages(messages, command.channel_id), MAX_RETRIES),
      new Promise((_, reject) => setTimeout(() => reject(new Error('OpenAI timeout')), OPENAI_TIMEOUT))
    ]);

    // Cache the summary
    cache.set(cacheKey, summary, RATE_LIMIT_DURATION);

    // Send the formatted response
    await sendFormattedResponse(respond, summary, startOfWeekTimestamp, messages.length);
  } catch (error) {
    logger.error('Error handling summarize command', { error, channel: command.channel_id });

    let errorMessage = 'Sorry, something went wrong while generating the summary. 😕';
    if (error.message.includes('CHANNEL_NOT_FOUND')) {
      errorMessage = "I don't have access to this channel. Please add me first! 🔒";
    } else if (error.message.includes('RATE_LIMIT')) {
      errorMessage = "I'm being rate-limited. Please try again in a few minutes. ⏳";
    }

    await respond({
      replace_original: true,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: errorMessage
          }
        }
      ]
    });
  }
};

module.exports = {
  handleSummarizeCommand
};
