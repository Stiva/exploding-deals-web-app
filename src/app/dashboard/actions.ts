'use server';

import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db"; // We need to export db instance
import { decks, cards } from "@/db/schema";
import { generateDeck } from "@/lib/generator/engine";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

// Make sure to implement a db instance singleton in src/db/index.ts first!
// For now, I'll write this action assuming the db export exists.

export async function createDeckAction() {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId) {
        throw new Error("Unauthorized");
    }

    // 1. Create Deck Record
    const [newDeck] = await db.insert(decks).values({
        userId: userId,
        status: 'generating',
        name: `${user?.firstName || 'User'}'s Deck`
    }).returning();

    // 2. Trigger Generation (Async ideally, but sync for Vercel timeout limits? 
    // If generation is slow, Vercel Serverless might timeout (10s-60s limit). 
    // For MVP, we run it sync. If too slow, move to Inngest or specialized worker.
    // engine.ts uses Sharp which is fast. Uploading 50 cards might take time.

    try {
        const generatedCards = await generateDeck({
            deckId: newDeck.id,
            userId
        });

        // 3. Save Cards to DB
        if (generatedCards && generatedCards.length > 0) {
            await db.insert(cards).values(
                generatedCards.map(c => ({
                    deckId: newDeck.id,
                    mechanicId: c.mechanic_id,
                    name: c.name,
                    flavorText: c.flavor_text || '',
                    imageUrl: c.imageUrl
                }))
            );
        }

        // 4. Update Status
        await db.update(decks)
            .set({ status: 'completed' })
            .where(eq(decks.id, newDeck.id));

    } catch (e) {
        console.error("Deck Gen Error", e);
        await db.update(decks)
            .set({ status: 'failed' })
            .where(eq(decks.id, newDeck.id));
        throw e;
    }

    revalidatePath('/dashboard');
    // return { success: true, deckId: newDeck.id }; // Removed to satisfy form action void return
}
