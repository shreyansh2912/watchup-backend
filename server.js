import express from 'express';
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn("WARNING: Google Client ID or Secret is missing in .env file. Google Login will fail.");
}


const corsOptions = {
  origin: true, // Allow all origins dynamically
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Channel-Id'],
  credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight for all routes
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
import passport from './config/passport.js';
app.use(passport.initialize());

import { db } from './db/index.js';
import authRoutes from './routes/authRoutes.js';
import videoRoutes from './routes/videoRoutes.js';
import likeRoutes from './routes/likeRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import channelRoutes from './routes/channelRoutes.js';
import historyRoutes from './routes/historyRoutes.js';
import playlistRoutes from './routes/playlistRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import canvasRoutes from './routes/canvasRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import shortsRoutes from './routes/shortsRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import membershipRoutes from './routes/membershipRoutes.js';


app.use('/api/shorts', shortsRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/canvas', canvasRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/shorts', shortsRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/memberships', membershipRoutes);

db.query.users.findFirst().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.log('Database connection check failed (tables might not exist yet):', err.message);
  // Start server anyway to allow migrations or other tasks
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (DB check failed)`);
  });
});
