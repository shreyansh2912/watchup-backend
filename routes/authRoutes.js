import express from 'express';
import { register, login } from '../controllers/authController.js';
import passport from '../config/passport.js';
import jwt from 'jsonwebtoken';

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

// Google Auth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login' }),
    (req, res) => {
        const token = generateToken(req.user);
        // Redirect to frontend with token
        res.redirect(`http://localhost:3000/login?token=${token}&user=${encodeURIComponent(JSON.stringify(req.user))}`);
    }
);

// Facebook Auth
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'], session: false }));

router.get('/facebook/callback',
    passport.authenticate('facebook', { session: false, failureRedirect: '/login' }),
    (req, res) => {
        const token = generateToken(req.user);
        res.redirect(`http://localhost:3000/login?token=${token}&user=${encodeURIComponent(JSON.stringify(req.user))}`);
    }
);

export default router;
