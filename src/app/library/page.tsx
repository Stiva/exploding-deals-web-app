import { db } from '@/db';
import { decks, cards } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';
import Image from 'next/image';

export default async function LibraryPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    const user = await currentUser();
    // Assuming searchParams is just a promise in older versions, or object in later. 
    // Next 15+ searchParams is async. Next 14 is object.
    // Spec says Next 14+. Let's treat it as props.
    // Safest access.
    const deckIdParam = searchParams?.deckId;

    // Fetch all user decks for the sidebar/filter
    const userDecks = await db.select().from(decks).where(eq(decks.userId, user?.id || '')).orderBy(desc(decks.createdAt));

    const selectedDeckId = deckIdParam ? Number(deckIdParam) : (userDecks[0]?.id || 0);

    // Fetch cards for selected deck
    const deckCards = selectedDeckId ? await db.select().from(cards).where(eq(cards.deckId, selectedDeckId)) : [];
    const selectedDeck = userDecks.find(d => d.id === selectedDeckId);

    return (
        <div className="flex min-h-screen">
            {/* Sidebar */}
            <aside className="w-64 bg-gray-50 border-r p-6 hidden md:block">
                <h2 className="font-bold text-lg mb-4">My Decks</h2>
                <ul className="space-y-2">
                    {userDecks.map(deck => (
                        <li key={deck.id}>
                            <Link
                                href={`/library?deckId=${deck.id}`}
                                className={`block px-4 py-2 rounded-lg ${selectedDeckId === deck.id ? 'bg-blue-100 text-blue-800 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                                {deck.name}
                            </Link>
                        </li>
                    ))}
                </ul>
                <div className="mt-8 border-t pt-4">
                    <Link href="/dashboard" className="text-sm text-gray-500 hover:text-black">&larr; Back to Dashboard</Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold flex items-center gap-4">
                        {selectedDeck?.name || 'Library'}
                        {selectedDeck && <span className="text-sm px-3 py-1 bg-gray-100 rounded-full font-normal text-gray-500">{selectedDeck?.status}</span>}
                    </h1>
                </div>

                {deckCards.length === 0 ? (
                    <div className="text-center text-gray-500 mt-20">
                        <p>No cards found in this deck.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {deckCards.map(card => (
                            <div key={card.id} className="group relative aspect-[3/4] bg-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition">
                                {card.imageUrl ? (
                                    <Image
                                        src={card.imageUrl}
                                        alt={card.name}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400">Processing...</div>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 translate-y-full group-hover:translate-y-0 transition-transform">
                                    <p className="text-white font-bold">{card.name}</p>
                                    <p className="text-white/80 text-xs line-clamp-2">{card.flavorText}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
