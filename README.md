# Slackify - Weekly Channel Summarizer Bot

A Slack bot that generates AI-powered weekly summaries of channel conversations. The bot uses the `/summarize` command to create comprehensive summaries of channel discussions using OpenAI's GPT model.

## Features

- Weekly channel conversation summaries
- AI-powered content analysis
- Easy-to-use slash command
- Configurable time periods
- Rich text formatting in summaries

## Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)
- A Slack workspace with admin access
- OpenAI API account

## Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/slackify.git
cd slackify
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

## Configuration

### Environment Variables

Configure the following environment variables in your `.env` file:

```env
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_APP_TOKEN=xapp-your-app-token
OPENAI_API_KEY=your-openai-api-key
PORT=3000
```

### Setting up Slack App

1. Go to [Slack API](https://api.slack.com/apps) and create a new app
2. Under "Basic Information":
- Copy the "Signing Secret" to `SLACK_SIGNING_SECRET`
3. Under "OAuth & Permissions":
- Add the following bot token scopes:
    - `channels:history`
    - `channels:read`
    - `chat:write`
    - `commands`
- Install the app to your workspace
- Copy the "Bot User OAuth Token" to `SLACK_BOT_TOKEN`
4. Under "Socket Mode":
- Enable Socket Mode
- Generate and copy the app-level token to `SLACK_APP_TOKEN`
5. Under "Slash Commands":
- Create a new command `/summarize`
- Set the description: "Generate a summary of channel messages"

### OpenAI API Setup

1. Visit [OpenAI API](https://platform.openai.com/)
2. Create an account or log in
3. Navigate to API keys section
4. Generate a new API key
5. Copy the key to `OPENAI_API_KEY` in your `.env` file

## Usage

### Starting the Bot

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

### Available Commands

#### /summarize
Generates a summary of channel messages for the past week.

Options:
- `days`: Number of days to summarize (default: 7)
Example: `/summarize days:14`

## Development

### Project Structure

```
src/
├── config.js         # Configuration and environment variables
├── handlers/         # Command and event handlers
├── services/         # Core services (Slack, OpenAI)
└── utils/            # Utility functions
```

### Running Tests

```bash
npm test
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to the branch
5. Open a Pull Request

## Troubleshooting

### Common Issues

1. **Bot not responding**: Verify Socket Mode is enabled and app token is correct
2. **Authorization errors**: Check bot token scopes and reinstall app if needed
3. **OpenAI errors**: Verify API key and usage limits

## License

MIT License - see LICENSE file for details

## Support

For issues and feature requests, please open an issue on GitHub.

