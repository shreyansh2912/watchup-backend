import express from 'express';
import { register, login, setPassword } from '../controllers/authController.js';
import passport from '../config/passport.js';
import jwt from 'jsonwebtoken';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, username: user.username, email: user.email },
        process.env.JWT_SECRET || 'secret_key_change_me',
        { expiresIn: '7d' }
    );
};

router.post('/register', register);
router.post('/login', login);
router.post('/set-password', verifyToken, setPassword);

// Google Auth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login' }),
    (req, res) => {
        const token = generateToken(req.user);
        const hasPassword = !!req.user.passwordHash;
        // Redirect to frontend with token
        res.redirect(`http://localhost:3000/login?token=${token}&user=${encodeURIComponent(JSON.stringify({
            id: req.user.id,
            username: req.user.username,
            email: req.user.email,
            hasPassword: hasPassword
        }))}`);
    }
);

// Facebook Auth
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'], session: false }));

router.get('/facebook/callback',
    passport.authenticate('facebook', { session: false, failureRedirect: '/login' }),
    (req, res) => {
        const token = generateToken(req.user);
        const hasPassword = !!req.user.passwordHash;
        res.redirect(`http://localhost:3000/login?token=${token}&user=${encodeURIComponent(JSON.stringify({
            id: req.user.id,
            username: req.user.username,
            email: req.user.email,
            hasPassword: hasPassword
        }))}`);
    }
);

export default router;
