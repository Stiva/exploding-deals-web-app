import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";

export const statusEnum = pgEnum('status', ['generating', 'completed', 'failed']);

export const users = pgTable('users', {
    id: text('id').primaryKey(), // Clerk ID
    email: text('email').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const decks = pgTable('decks', {
    id: serial('id').primaryKey(),
    userId: text('user_id').references(() => users.id).notNull(),
    name: text('name').default('My Deck').notNull(),
    status: statusEnum('status').default('generating').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const cards = pgTable('cards', {
    id: serial('id').primaryKey(),
    deckId: integer('deck_id').references(() => decks.id).notNull(),
    mechanicId: text('mechanic_id').notNull(),
    imageUrl: text('image_url'),
    name: text('name').notNull(),
    flavorText: text('flavor_text'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
