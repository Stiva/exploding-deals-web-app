'use server';

import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db"; // We need to export db instance
import { decks, cards, users } from "@/db/schema";
import { generateDeck } from "@/lib/generator/engine";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

// Make sure to implement a db instance singleton in src/db/index.ts first!
// For now, I'll write this action assuming the db export exists.

export async function createDeckAction(formData: FormData) {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId) {
        throw new Error("Unauthorized");
    }

    // 0. Ensure User Exists (Lazy Sync)
    // We need the user in our DB to satisfy the FK constraint for Decks.
    const [existingUser] = await db.select().from(users).where(eq(users.id, userId));

    if (!existingUser) {
        await db.insert(users).values({
            id: userId,
            email: user?.emailAddresses[0]?.emailAddress || 'no-email',
        });
    }

    // 0b. Parse Manifest File
    const file = formData.get('manifest') as File;
    if (!file) {
        throw new Error("No manifest file provided");
    }

    const text = await file.text();
    let manifestData;
    try {
        manifestData = JSON.parse(text);
        if (!Array.isArray(manifestData)) throw new Error("Manifest must be an array");
    } catch (e) {
        console.error("Invalid JSON", e);
        throw new Error("Invalid JSON manifest");
    }

    // 1. Create Deck Record
    const [newDeck] = await db.insert(decks).values({
        userId: userId,
        status: 'generating',
        name: `${user?.firstName || 'User'}'s Deck (${new Date().toLocaleTimeString()})`
    }).returning();

    // 2. Trigger Generation (Async ideally, but sync for Vercel timeout limits? 
    // If generation is slow, Vercel Serverless might timeout (10s-60s limit). 
    // For MVP, we run it sync. If too slow, move to Inngest or specialized worker.
    // engine.ts uses Sharp which is fast. Uploading 50 cards might take time.

    try {
        const generatedCards = await generateDeck({
            deckId: newDeck.id,
            userId
        }, manifestData);

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
