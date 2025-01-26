const { App } = require("@slack/bolt");
const { OpenAI } = require("openai");
require("dotenv").config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_SOCKET_TOKEN
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.command("/summarize", async ({ command, ack, say }) => {
    try {
      // Immediate acknowledgment with loading message
      await ack({
        response_type: "ephemeral",
        text: ":hourglass: Generating weekly report..."
      });

      // Post visible in-channel message
      const processingMsg = await say({
        text: ":robot_face: Starting weekly summary generation...",
        channel: command.channel_id
      });

      const oneWeekAgo = Math.floor(Date.now() / 1000) - 604800;
      const result = await app.client.conversations.history({
        channel: command.channel_id,
        oldest: oneWeekAgo.toString(),
        limit: 1000
      });

      const userActivities = {};
      const userCache = new Map();

      // Batch user lookup for better performance
      const userIds = [...new Set(
        result.messages
          .filter(msg => msg.user)
          .map(msg => msg.user)
      )];

      // Process users in parallel with rate limiting
      await Promise.all(userIds.map(async (userId, index) => {
        await new Promise(resolve => setTimeout(resolve, index * 100)); // 100ms spacing
        try {
          const userInfo = await app.client.users.info({ user: userId });
          userCache.set(userId, userInfo.user.real_name || userInfo.user.name);
        } catch (error) {
          userCache.set(userId, `User ${userId.substring(0, 6)}`);
        }
      }));

      // Process messages
      for (const msg of result.messages) {
        if (!msg.user || msg.subtype) continue;
        const username = userCache.get(msg.user);
        userActivities[username] = [
          ...(userActivities[username] || []),
          `[${new Date(msg.ts * 1000).toLocaleDateString()}] ${msg.text}`
        ];
      }

      const activityText = Object.entries(userActivities)
        .map(([user, msgs]) => `${user}:\n${msgs.join("\n")}`)
        .join("\n\n");

      if (!activityText) {
        await say({
          text: "No activity found this week.",
          channel: command.channel_id,
          thread_ts: processingMsg.ts
        });
        return;
      }

      // Update with progress
      await app.client.chat.update({
        channel: command.channel_id,
        ts: processingMsg.ts,
        text: ":mag: Analyzing messages..."
      });

      // Generate summary
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{
          role: "user",
          content: `Create a weekly summary grouped by user from these Slack messages. 
          For each user, list their key contributions in bullet points. 
          Focus on completed tasks and decisions. Format:
          
          *User Name*
          - Contribution 1
          - Contribution 2
          
          Messages:\n${activityText}`
        }]
      });

      // Final update with results
      await app.client.chat.update({
        channel: command.channel_id,
        ts: processingMsg.ts,
        text: `*Weekly Summary for <#${command.channel_id}>:*\n${completion.choices[0].message.content}`
      });

    } catch (error) {
      console.error("Error:", error);
      await say({
        text: `:warning: Failed to generate summary: ${error.message}`,
        channel: command.channel_id
      });
    }
});

(async () => {
  const port = 3000;
  await app.start(process.env.PORT || port);
  console.log('Bolt app started!!');
})();