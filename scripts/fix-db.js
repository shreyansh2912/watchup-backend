import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function fixDatabase() {
    try {
        console.log('Connecting to database...');
        const client = await pool.connect();
        console.log('Connected.');

        console.log('Adding subscriber_channel_id column...');
        await client.query(`
      ALTER TABLE subscriptions 
      ADD COLUMN IF NOT EXISTS subscriber_channel_id INTEGER REFERENCES channels(id);
    `);

        console.log('Adding channel_id column...');
        await client.query(`
      ALTER TABLE subscriptions 
      ADD COLUMN IF NOT EXISTS channel_id INTEGER REFERENCES channels(id);
    `);

        console.log('Adding channel_id to likes...');
        await client.query(`
      ALTER TABLE likes 
      ADD COLUMN IF NOT EXISTS channel_id INTEGER REFERENCES channels(id);
    `);

        console.log('Adding channel_id to comments...');
        await client.query(`
      ALTER TABLE comments 
      ADD COLUMN IF NOT EXISTS channel_id INTEGER REFERENCES channels(id);
    `);

        console.log('Adding channel_id to history...');
        await client.query(`
      ALTER TABLE history 
      ADD COLUMN IF NOT EXISTS channel_id INTEGER REFERENCES channels(id);
    `);

        console.log('Adding channel_id to playlists...');
        await client.query(`
      ALTER TABLE playlists 
      ADD COLUMN IF NOT EXISTS channel_id INTEGER REFERENCES channels(id);
    `);

        console.log('Adding reporter_channel_id to reports...');
        await client.query(`
      ALTER TABLE reports 
      ADD COLUMN IF NOT EXISTS reporter_channel_id INTEGER REFERENCES channels(id);
    `);

        console.log('Database schema updated successfully.');
        client.release();
    } catch (err) {
        console.error('Error updating database:', err);
    } finally {
        await pool.end();
    }
}

fixDatabase();
