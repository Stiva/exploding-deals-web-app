import { currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';
import { createDeckAction } from './actions';
import { db } from '@/db';
import { decks } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export default async function DashboardPage() {
    const user = await currentUser();

    // Fetch user decks basic info
    // Assuming user.id is the Clerk ID used in DB
    let userDecks: typeof decks.$inferSelect[] = [];

    if (user?.id) {
        userDecks = await db.select().from(decks).where(eq(decks.userId, user.id)).orderBy(desc(decks.createdAt));
    }

    return (
        <div className="p-8 max-w-7xl mx-auto font-[family-name:var(--font-geist-sans)]">
            <div className="flex justify-between items-center mb-12 flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <p className="text-gray-500">Welcome back, {user?.firstName || 'Agent'}</p>
                </div>
                <form action={createDeckAction}>
                    <button type="submit" className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 transition shadow-lg">
                        + Generate New Deck
                    </button>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userDecks.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-gray-400 min-h-[200px] col-span-full">
                        <p className="text-xl mb-2">No decks generated yet.</p>
                        <p className="text-sm">Start by clicking the generate button.</p>
                    </div>
                ) : (
                    userDecks.map(deck => (
                        <div key={deck.id} className="border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition bg-white flex flex-col justify-between h-[200px]">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <h2 className="text-xl font-bold truncate max-w-[70%]">{deck.name}</h2>
                                    <span className={`px-2 py-1 text-xs rounded-full uppercase font-bold tracking-wider ${deck.status === 'completed' ? 'bg-green-100 text-green-700' : deck.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {deck.status}
                                    </span>
                                </div>
                                <p className="text-gray-500 text-sm">Created: {deck.createdAt.toLocaleDateString()}</p>
                            </div>
                            <Link href={`/library?deckId=${deck.id}`} className="text-blue-600 font-semibold hover:underline mt-4 inline-block">
                                View Deck &rarr;
                            </Link>
                        </div>
                    ))
                )}
            </div>

            <div className="mt-12">
                <Link href="/library" className="text-blue-600 hover:underline">Go to Library &rarr;</Link>
            </div>
        </div>
    );
}
