const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
      rejectUnauthorized: false
  }
});

const createTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS installations (
      id SERIAL PRIMARY KEY,
      team_id VARCHAR(255) NOT NULL UNIQUE,
      bot_token TEXT NOT NULL,
      bot_refresh_token TEXT,
      bot_token_expires_at TIMESTAMP,
      installed_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS channels (
      id SERIAL PRIMARY KEY,
      team_id VARCHAR(255) NOT NULL,
      channel_id VARCHAR(255) NOT NULL,
      last_summarized TIMESTAMP,
      settings JSONB,
      UNIQUE(team_id, channel_id)
    );
  `);
};

const storeInstallation = async (installation) => {
  const query = `
    INSERT INTO installations 
    (team_id, bot_token, bot_refresh_token, bot_token_expires_at)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (team_id) DO UPDATE SET
      bot_token = EXCLUDED.bot_token,
      bot_refresh_token = EXCLUDED.bot_refresh_token,
      bot_token_expires_at = EXCLUDED.bot_token_expires_at
  `;
  
  const expiresAt = installation.bot.expiresAt 
    ? new Date(installation.bot.expiresAt * 1000)
    : null;
  
  await pool.query(query, [
    installation.team.id,
    installation.bot.token,
    installation.bot.refreshToken || null,
    expiresAt
  ]);
};
const fetchInstallation = async (installQuery) => {
  // Get teamId from the query object or use it directly if it's a string
  const teamId = typeof installQuery === 'string' ? installQuery : installQuery.teamId;
  
  const { rows } = await pool.query(
    'SELECT * FROM installations WHERE team_id = $1',
    [teamId]
  );
  
  if (rows.length === 0) return undefined;
  
  // Transform the database record into the format Bolt expects
  return {
    team: { id: rows[0].team_id },
    bot: {
      token: rows[0].bot_token,
      refreshToken: rows[0].bot_refresh_token,
      expiresAt: rows[0].bot_token_expires_at
        ? Math.floor(new Date(rows[0].bot_token_expires_at).getTime() / 1000)
        : undefined
    },
    tokenType: 'bot'
  };
};

module.exports = { pool, createTables, storeInstallation, fetchInstallation };