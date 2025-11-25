import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { users, channels } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { successResponse, errorResponse } from '../utils/responseHandler.js';

const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, username: user.username, email: user.email },
        process.env.JWT_SECRET || 'secret_key_change_me',
        { expiresIn: '7d' }
    );
};

export const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return errorResponse(res, 400, 'All fields are required');
        }

        const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (existingUser.length > 0) {
            return errorResponse(res, 400, 'User already exists');
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const [newUser] = await db.insert(users).values({
            username,
            email,
            passwordHash,
        }).returning();

        await db.insert(channels).values({
            userId: newUser.id,
            name: username, // Default channel name is username
            handle: `@${username}`, // Default handle
            description: `Welcome to ${username}'s channel`,
        });

        const token = generateToken(newUser);

        return successResponse(res, 201, 'User registered successfully', {
            token,
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
            },
        });
    } catch (error) {
        console.error('Register Error:', error);
        return errorResponse(res, 500, 'Server Error', error.message);
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find User
        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!user) {
            return errorResponse(res, 400, 'Invalid credentials');
        }

        // Check Password
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return errorResponse(res, 400, 'Invalid credentials');
        }

        const token = generateToken(user);

        return successResponse(res, 200, 'Login successful', {
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        });
    } catch (error) {
        console.error('Login Error:', error);
        return errorResponse(res, 500, 'Server Error', error.message);
    }
};
