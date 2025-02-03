const { WebClient } = require('@slack/web-api');
const { OpenAI } = require('openai');
const { fetchInstallation } = require('../db');

module.exports = (app) => {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  app.command('/summarize', async ({ command, ack, respond }) => {
    try {
        // Immediate acknowledgment
        await ack({
        response_type: "ephemeral",
        text: ":hourglass: Generating weekly report..."
        });
    
        // Fetch team-specific token
        const installation = await fetchInstallation(command.team_id);
        if (!installation) throw new Error('Workspace not installed properly');
        
        const teamClient = new WebClient(installation.bot.token);
    
        // Post initial message
        const processingMsg = await teamClient.chat.postMessage({
        channel: command.channel_id,
        text: ":robot_face: Starting weekly summary generation..."
        });
    
        // Fetch channel history
        const oneWeekAgo = Math.floor(Date.now() / 1000) - 604800;
        const result = await teamClient.conversations.history({
        channel: command.channel_id,
        oldest: oneWeekAgo.toString(),
        limit: 1000
        });
    
        // Track user activities
        const userActivities = {};
        const userCache = new Map();
    
        // Batch user lookup
        const userIds = [...new Set(
        result.messages
            .filter(msg => msg.user)
            .map(msg => msg.user)
        )];
    
        // Update progress
        await teamClient.chat.update({
        channel: command.channel_id,
        ts: processingMsg.ts,
        text: ":busts_in_silhouette: Looking up user information..."
        });
    
        // Process users in parallel with rate limiting
        await Promise.all(userIds.map(async (userId, index) => {
        await new Promise(resolve => setTimeout(resolve, index * 100));
        try {
            const userInfo = await teamClient.users.info({ user: userId });
            userCache.set(userId, userInfo.user.real_name || userInfo.user.name);
        } catch (error) {
            userCache.set(userId, `User ${userId.substring(0, 6)}`);
        }
        }));
    
        // Process messages
        await teamClient.chat.update({
        channel: command.channel_id,
        ts: processingMsg.ts,
        text: ":mag: Processing messages..."
        });
    
        for (const msg of result.messages) {
        if (!msg.user || msg.subtype || msg.bot_id) continue;
        const username = userCache.get(msg.user);
        userActivities[username] = [
            ...(userActivities[username] || []),
            `[${new Date(parseInt(msg.ts) * 1000).toLocaleDateString()}] ${msg.text}`
        ];
        }
    
        const activityText = Object.entries(userActivities)
        .map(([user, msgs]) => `${user}:\n${msgs.join("\n")}`)
        .join("\n\n");
    
        if (!activityText) {
        await teamClient.chat.update({
            channel: command.channel_id,
            ts: processingMsg.ts,
            text: "No activity found this week."
        });
        return;
        }
    
        // Update with analysis progress
        await teamClient.chat.update({
        channel: command.channel_id,
        ts: processingMsg.ts,
        text: ":brain: Generating AI summary..."
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