import { pgEnum } from 'drizzle-orm/pg-core';

export const likeTypeEnum = pgEnum('like_type', ['LIKE', 'DISLIKE']);
