import { db } from '../db/index.js';
import { courses } from '../db/schema/courses.js';
import { enrollments } from '../db/schema/enrollments.js';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { successResponse, errorResponse } from '../utils/responseHandler.js';

let stripe;
if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
} else {
    console.warn("STRIPE_SECRET_KEY is missing. Stripe features will be disabled.");
}

let razorpay;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
} else {
    console.warn("RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing. Razorpay features will be disabled.");
}

export const createStripeCheckoutSession = async (req, res) => {
    try {
        const { courseId } = req.body;
        const userId = req.user.id;

        const course = await db.query.courses.findFirst({
            where: eq(courses.id, parseInt(courseId)),
        });

        if (!course) return errorResponse(res, 404, "Course not found");

        if (!stripe) {
            return errorResponse(res, 503, "Service Unavailable", "Stripe is not configured");
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'inr', // or usd
                    product_data: {
                        name: course.title,
                        images: course.thumbnailUrl ? [course.thumbnailUrl] : [],
                    },
                    unit_amount: Math.round(course.price * 100), // Amount in cents/paise
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${process.env.CLIENT_URL}/courses/${course.slug}?success=true`,
            cancel_url: `${process.env.CLIENT_URL}/courses/${course.slug}?canceled=true`,
            metadata: {
                courseId: course.id.toString(),
                userId: userId.toString(),
            },
        });

        return successResponse(res, 200, "Stripe session created", { sessionId: session.id, url: session.url });
    } catch (error) {
        console.error("Stripe Session Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

export const createRazorpayOrder = async (req, res) => {
    try {
        const { courseId } = req.body;
        const userId = req.user.id;

        const course = await db.query.courses.findFirst({
            where: eq(courses.id, parseInt(courseId)),
        });

        if (!course) return errorResponse(res, 404, "Course not found");

        const options = {
            amount: Math.round(course.price * 100), // Amount in paise
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
            notes: {
                courseId: course.id.toString(),
                userId: userId.toString(),
            },
        };

        if (!razorpay) {
            return errorResponse(res, 503, "Service Unavailable", "Razorpay is not configured");
        }

        const order = await razorpay.orders.create(options);

        return successResponse(res, 200, "Razorpay order created", order);
    } catch (error) {
        console.error("Razorpay Order Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

export const handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const { courseId, userId } = session.metadata;

        try {
            await db.insert(enrollments).values({
                userId: parseInt(userId),
                courseId: parseInt(courseId),
                paymentId: session.payment_intent,
                amount: session.amount_total / 100,
                currency: session.currency,
                status: 'completed',
            });
            console.log(`Enrollment created for user ${userId} in course ${courseId}`);
        } catch (err) {
            console.error("Error creating enrollment:", err);
        }
    }

    res.json({ received: true });
};

export const handleRazorpayWebhook = async (req, res) => {
    // Razorpay webhook verification
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest('hex');

    if (digest === req.headers['x-razorpay-signature']) {
        const event = req.body.event;
        if (event === 'payment.captured') {
            const payment = req.body.payload.payment.entity;
            const { courseId, userId } = payment.notes;

            try {
                await db.insert(enrollments).values({
                    userId: parseInt(userId),
                    courseId: parseInt(courseId),
                    paymentId: payment.id,
                    amount: payment.amount / 100,
                    currency: payment.currency,
                    status: 'completed',
                });
                console.log(`Enrollment created for user ${userId} in course ${courseId}`);
            } catch (err) {
                console.error("Error creating enrollment:", err);
            }
        }
        res.json({ status: 'ok' });
    } else {
        res.status(400).json({ status: 'invalid signature' });
    }
};
