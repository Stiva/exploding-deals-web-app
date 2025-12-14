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
    let manifestData: any;
    let finalManifest: any[] = [];

    try {
        const json = JSON.parse(text);

        // Handle User's specific JSON structure (Object with cards array)
        if (!Array.isArray(json) && json.cards && Array.isArray(json.cards)) {
            finalManifest = json.cards.map((c: any) => ({
                id: c.card_id,
                mechanic_id: c.mechanic_id,
                name: c.metadata?.display_name || 'Unknown Card',
                flavor_text: c.metadata?.flavor_text || '',
                count: 1 // Default to 1
            }));
        }
        // Handle direct array (legacy/internal format)
        else if (Array.isArray(json)) {
            finalManifest = json;
        } else {
            throw new Error("Invalid JSON structure: Must be an array or object with 'cards' array");
        }
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

    // 2. Trigger Generation
    try {
        const generatedCards = await generateDeck({
            deckId: newDeck.id,
            userId
        }, finalManifest);

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
