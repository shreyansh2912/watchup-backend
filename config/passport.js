import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { db } from '../db/index.js';
import { users, channels } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';

const handleSocialLogin = async (profile, done) => {
    try {
        const email = profile.emails?.[0]?.value;
        const providerId = profile.id;
        const provider = profile.provider; // 'google' or 'facebook'

        // 1. Check if user exists with this provider ID
        let [user] = await db.select().from(users).where(
            provider === 'google'
                ? eq(users.googleId, providerId)
                : eq(users.facebookId, providerId)
        ).limit(1);

        if (user) {
            return done(null, user);
        }

        // 2. Check if user exists with the same email (link accounts)
        if (email) {
            [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
            if (user) {
                // Update user with provider ID
                await db.update(users)
                    .set(provider === 'google' ? { googleId: providerId } : { facebookId: providerId })
                    .where(eq(users.id, user.id));
                return done(null, user);
            }
        }

        // 3. Create new user
        const username = profile.displayName.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000);

        [user] = await db.insert(users).values({
            username,
            email: email || `${providerId}@${provider}.com`, // Fallback if no email
            googleId: provider === 'google' ? providerId : null,
            facebookId: provider === 'facebook' ? providerId : null,
            avatar: profile.photos?.[0]?.value,
        }).returning();

        // Auto-create channel
        await db.insert(channels).values({
            userId: user.id,
            name: profile.displayName,
            handle: `@${username}`,
            description: `Welcome to ${profile.displayName}'s channel`,
            avatarUrl: profile.photos?.[0]?.value,
        });

        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
};

const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${BASE_URL}/api/auth/google/callback`
},
    (accessToken, refreshToken, profile, done) => {
        handleSocialLogin(profile, done);
    }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: `${BASE_URL}/api/auth/facebook/callback`,
    profileFields: ['id', 'displayName', 'photos', 'email']
},
    (accessToken, refreshToken, profile, done) => {
        handleSocialLogin(profile, done);
    }
));

export default passport;
