module.exports = (receiver) => {
    const express = require('express');
    const router = express.Router();
  
    router.get('/slack/install', async (req, res) => {
      try {
        const url = await receiver.installer.generateInstallUrl({
          redirectUri: process.env.SLACK_REDIRECT_URI,
          scopes: ['commands', 'channels:history', 'users:read', 'chat:write']
        });
        res.redirect(url);
      } catch (error) {
        res.status(500).send(`Installation failed: ${error.message}`);
      }
    });
  
    router.get('/slack/oauth_redirect', async (req, res) => {
      try {
        await receiver.installer.handleCallback(req, res, {
          success: (installation, options, callbackReq, callbackRes) => {
            res.send('App installed successfully! You can close this window.');
          },
          failure: (error, options, callbackReq, callbackRes) => {
            res.status(500).send(`Installation failed: ${error}`);
          }
        });
      } catch (error) {
        res.status(500).send(error.toString());
      }
    });
  
    receiver.router.use('/auth', router);
  };