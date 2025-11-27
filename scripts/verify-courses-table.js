import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function main() {
    try {
        const res = await pool.query("SELECT to_regclass('public.courses');");
        if (res.rows[0].to_regclass) {
            console.log("Table 'courses' exists!");
        } else {
            console.error("Table 'courses' does NOT exist.");
        }
    } catch (err) {
        console.error('Error checking table:', err);
    } finally {
        await pool.end();
    }
}

main();
