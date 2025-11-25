import express from 'express';
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

import { db } from './db/index.js';

// Database Connection Check
db.query.users.findFirst().then(() => {
  console.log('Database connected successfully');
}).catch(err => {
  console.log('Database connection check failed (tables might not exist yet):', err.message);
});

// Basic Route
app.get('/', (req, res) => {
  res.send('Stremers Backend API is running');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
