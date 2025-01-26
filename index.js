const { App } = require("@slack/bolt");
const { OpenAI } = require("openai");
require("dotenv").config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_SOCKET_TOKEN
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Slash command handler for /summarize
// app.command("/summarize", async ({ command, ack, say }) => {
//   try {
//     // Acknowledge command request
//     await ack();
    
//     // Calculate time range (1 week ago)
//     const oneWeekAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
    
//     // Fetch channel history
//     const result = await app.client.conversations.history({
//       channel: command.channel_id,
//       oldest: oneWeekAgo.toString(),
//       limit: 1000
//     });
    
//     // Extract and format messages
//     const messages = result.messages
//       .filter(msg => msg.text && !msg.subtype) // Filter out system messages
//       .map(msg => `[${new Date(msg.ts * 1000).toLocaleDateString()}] ${msg.text}`)
//       .join("\n");

//     if (!messages) {
//       await say("No messages found in the last week.");
//       return;
//     }

//     // Generate summary with OpenAI
//     const completion = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{
//         role: "user",
//         content: `Generate a concise weekly work summary from these Slack messages:\n\n${messages}\n\nSummary:`
//       }]
//     });

//     // Post summary
//     await say(`*Weekly Summary for <#${command.channel_id}>:*\n${completion.choices[0].message.content}`);
    
//   } catch (error) {
//     console.error("Error handling /summarize:", error);
//     await say("Sorry, I encountered an error generating the summary.");
//   }
// });
app.command("/summarize", async ({ command, ack, say }) => {
    try {
      await ack();
      
      // Get messages from last week
      const oneWeekAgo = Math.floor(Date.now() / 1000) - 604800;
      const result = await app.client.conversations.history({
        channel: command.channel_id,
        oldest: oneWeekAgo.toString(),
        limit: 1000
      });
  
      // Group messages by user
      const userActivities = {};
      const userCache = new Map(); // Cache user info
      
      for (const msg of result.messages) {
        if (!msg.user || msg.subtype) continue; // Skip system messages
        
        // Get user info with caching
        if (!userCache.has(msg.user)) {
          try {
            const userInfo = await app.client.users.info({ user: msg.user });
            userCache.set(msg.user, userInfo.user.real_name || userInfo.user.name);
          } catch (error) {
            userCache.set(msg.user, `User ${msg.user.substring(0, 6)}`);
          }
          // Add delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        const username = userCache.get(msg.user);
        if (!userActivities[username]) userActivities[username] = [];
        
        userActivities[username].push(
          `[${new Date(msg.ts * 1000).toLocaleDateString()}] ${msg.text}`
        );
      }
  
      // Format for OpenAI
      const activityText = Object.entries(userActivities)
        .map(([user, messages]) => `User ${user}:\n${messages.join("\n")}`)
        .join("\n\n");
  
      if (!activityText) {
        await say("No user activity found in the last week.");
        return;
      }
  
      // Generate summary with user attribution
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{
          role: "user",
          content: `Create a weekly work summary grouped by user. For each user, list their key contributions \
          based on these messages. Focus on completed tasks, decisions made, and important discussions. \
          Format as: [User] - Summary of contributions\n\nMessages:\n${activityText}`
        }]
      });
  
      await say(`*Weekly User Contributions for <#${command.channel_id}>:*\n${completion.choices[0].message.content}`);
      
    } catch (error) {
      console.error("Error:", error);
      await say(`❌ Failed to generate summary: ${error.message}`);
    }
  });
  
// Existing message handler
app.message("hey", async ({ command, say }) => {
  try {
    await say("Hello Human!");
  } catch (error) {
    console.error(error);
  }
});

(async () => {
  const port = 3000;
  await app.start(process.env.PORT || port);
  console.log('Bolt app started!!');
})();