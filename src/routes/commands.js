const { WebClient } = require('@slack/web-api');
const { OpenAI } = require('openai');
const { fetchInstallation } = require('../db');

module.exports = (app) => {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  app.command('/summarize', async ({ command, ack, respond }) => {
    try {
      // Acknowledge immediately
      await ack();

      // Fetch team-specific token
      const installation = await fetchInstallation(command.team_id);
      if (!installation) throw new Error('Workspace not installed properly');
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
        .map(msg => `[${new Date(msg.ts * 1000).toLocaleDateString()}] ${msg.text}`)
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
      console.error('Command error:', error);
      await respond({
        response_type: 'ephemeral',
        text: `:warning: Error: ${error.message}`
      });
    }
  });
};