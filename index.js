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
      await ack();
      
      
      const oneWeekAgo = Math.floor(Date.now() / 1000) - 604800;
      const result = await app.client.conversations.history({
        channel: command.channel_id,
        oldest: oneWeekAgo.toString(),
        limit: 1000
      });
  
      
      const userActivities = {};
      const userCache = new Map(); 
      
      for (const msg of result.messages) {
        if (!msg.user || msg.subtype) continue; 
        
        
        if (!userCache.has(msg.user)) {
          try {
            const userInfo = await app.client.users.info({ user: msg.user });
            userCache.set(msg.user, userInfo.user.real_name || userInfo.user.name);
          } catch (error) {
            userCache.set(msg.user, `User ${msg.user.substring(0, 6)}`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        const username = userCache.get(msg.user);
        if (!userActivities[username]) userActivities[username] = [];
        
        userActivities[username].push(
          `[${new Date(msg.ts * 1000).toLocaleDateString()}] ${msg.text}`
        );
      }
  
      
      const activityText = Object.entries(userActivities)
        .map(([user, messages]) => `User ${user}:\n${messages.join("\n")}`)
        .join("\n\n");
  
      if (!activityText) {
        await say("No user activity found in the last week.");
        return;
      }
  
      
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
  

(async () => {
  const port = 3000;
  await app.start(process.env.PORT || port);
  console.log('Bolt app started!!');
})();