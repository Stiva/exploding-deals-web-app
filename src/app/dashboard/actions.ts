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
    const user = await currentUser(); // Fetch full user details from Clerk

    if (!userId) {
        throw new Error("Unauthorized");
    }

    // 0a. Lazy Sync User & Auth Check
    const existingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    let dbUser = existingUser[0];

    // Auto-approve Logic
    const isSuperAdminEmail = user?.emailAddresses?.some(e => e.emailAddress === 'fstivani@gmail.com');

    if (!dbUser) {
        // Create new user
        const [newUser] = await db.insert(users).values({
            id: userId,
            email: user?.primaryEmailAddress?.emailAddress || 'unknown',
            isAdmin: isSuperAdminEmail || false,
            isApproved: isSuperAdminEmail || false
        }).returning();
        dbUser = newUser;
    } else if (isSuperAdminEmail && (!dbUser.isAdmin || !dbUser.isApproved)) {
        // Self-heal super admin if needed
        const [updatedUser] = await db.update(users)
            .set({ isAdmin: true, isApproved: true })
            .where(eq(users.id, userId))
            .returning();
        dbUser = updatedUser;
    }

    // Permission Gate
    if (!dbUser.isApproved) {
        throw new Error("Account pending approval. Please contact an administrator.");
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
                image_prompt: c.metadata?.image_prompt || c.metadata?.display_name + " in style of The Oatmeal",
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
    const model = formData.get('model') as string || 'gemini-2.5-flash-image';

    try {
        const generatedCards = await generateDeck({
            deckId: newDeck.id,
            userId,
            model
        }, finalManifest);

        // 3. Save Cards to DB
        if (generatedCards && generatedCards.length > 0) {
            await db.insert(cards).values(generatedCards.map(c => ({
                deckId: newDeck.id,
                mechanicId: c.mechanic_id,
                name: c.name,
                flavorText: c.flavor_text,
                imageUrl: c.imageUrl
            })));
        }

        // 4. Update Deck Status
        await db.update(decks).set({ status: 'completed' }).where(eq(decks.id, newDeck.id));

    } catch (error) {
        console.error("Deck Generation Failed", error);
        await db.update(decks).set({ status: 'failed' }).where(eq(decks.id, newDeck.id));
        throw error; // Re-throw so client knows
    }

    revalidatePath('/dashboard');
    return { success: true, deckId: newDeck.id };
}

export async function deleteDeckAction(deckId: number) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    // Verify ownership or admin
    const deck = await db.select().from(decks).where(eq(decks.id, deckId)).limit(1);
    if (!deck || deck.length === 0) {
        throw new Error("Deck not found");
    }

    if (deck[0].userId !== userId) {
        // Technically Admin could delete, but let's stick to owner for now unless requested
        throw new Error("Unauthorized");
    }

    await db.delete(decks).where(eq(decks.id, deckId));
    revalidatePath('/dashboard');
}
