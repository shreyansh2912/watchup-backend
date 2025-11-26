import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function addNotificationsTable() {
    try {
        console.log('Connecting to database...');
        const client = await pool.connect();
        console.log('Connected.');

        console.log('Creating notifications table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        recipient_channel_id INTEGER NOT NULL REFERENCES channels(id),
        sender_channel_id INTEGER NOT NULL REFERENCES channels(id),
        type TEXT NOT NULL,
        video_id INTEGER REFERENCES videos(id),
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

        console.log('Notifications table created successfully.');
        client.release();
    } catch (err) {
        console.error('Error creating notifications table:', err);
    } finally {
        await pool.end();
    }
}

addNotificationsTable();
