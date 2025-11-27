import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

function generateRandomString(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')     // Replace spaces with -
        .replace(/[^\w\-]+/g, '') // Remove all non-word chars
        .replace(/\-\-+/g, '-');  // Replace multiple - with single -
}

async function main() {
    console.log('Starting migration: Adding slug column to videos table...');

    try {
        // 1. Add the column
        await pool.query('ALTER TABLE videos ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;');
        console.log('Column added (if it didn\'t exist).');

        // 2. Fetch all videos that need a slug
        const res = await pool.query(`
      SELECT v.id, v.title, c.name as channel_name 
      FROM videos v 
      JOIN channels c ON v.channel_id = c.id 
      WHERE v.slug IS NULL
    `);

        const videosToUpdate = res.rows;
        console.log(`Found ${videosToUpdate.length} videos to backfill.`);

        for (const video of videosToUpdate) {
            const randomStr = generateRandomString(8);
            const channelSlug = slugify(video.channel_name);
            const slug = `${randomStr}-${channelSlug}`;

            await pool.query('UPDATE videos SET slug = $1 WHERE id = $2', [slug, video.id]);
            console.log(`Updated video ${video.id} with slug: ${slug}`);
        }

        console.log('Migration complete.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

main();
