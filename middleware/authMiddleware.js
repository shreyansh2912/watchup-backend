import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access Denied: No Token Provided' });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_change_me');
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ message: 'Invalid Token' });
    }
}

export const optionalVerifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_change_me');
        req.user = verified;
        next();
    } catch (err) {
        // If token is invalid, just treat as unauthenticated
        req.user = null;
        next();
    }
};
