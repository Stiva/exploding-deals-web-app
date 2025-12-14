import { db } from '@/db';
import { decks, cards } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';
import Image from 'next/image';
import styles from './library.module.css';

export default async function LibraryPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    const user = await currentUser();
    const deckIdParam = searchParams?.deckId;

    // Fetch all user decks for the sidebar/filter
    const userDecks = await db.select().from(decks).where(eq(decks.userId, user?.id || '')).orderBy(desc(decks.createdAt));

    const selectedDeckId = deckIdParam ? Number(deckIdParam) : (userDecks[0]?.id || 0);

    // Fetch cards for selected deck
    const deckCards = selectedDeckId ? await db.select().from(cards).where(eq(cards.deckId, selectedDeckId)) : [];
    const selectedDeck = userDecks.find(d => d.id === selectedDeckId);

    return (
        <div className={styles.layout}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <h2 className={styles.sidebar_title}>My Decks</h2>
                <ul className={styles.deck_list}>
                    {userDecks.map(deck => (
                        <li key={deck.id}>
                            <Link
                                href={`/library?deckId=${deck.id}`}
                                className={`${styles.deck_link} ${selectedDeckId === deck.id ? styles.deck_link_active : ''}`}
                            >
                                {deck.name}
                            </Link>
                        </li>
                    ))}
                </ul>
                <div style={{ marginTop: '2rem', borderTop: '1px solid #333', paddingTop: '1rem' }}>
                    <Link href="/dashboard" style={{ fontSize: '0.9rem', color: '#666' }}>&larr; Back to Dashboard</Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className={styles.main}>
                <div className={styles.header}>
                    <h1 className={styles.deck_title}>
                        {selectedDeck?.name || 'Library'}
                    </h1>
                    {selectedDeck && <span className={styles.status_pill}>{selectedDeck?.status}</span>}
                </div>

                {deckCards.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#666', marginTop: '5rem' }}>
                        <p>No cards found in this deck.</p>
                    </div>
                ) : (
                    <div className={styles.card_grid}>
                        {deckCards.map(card => (
                            <div key={card.id} className={styles.card_item}>
                                {card.imageUrl ? (
                                    <>
                                        <p className={styles.debug_url} style={{ display: 'none' }}>{card.imageUrl}</p>
                                        <Image
                                            src={card.imageUrl}
                                            alt={card.name}
                                            fill
                                            unoptimized
                                            style={{ objectFit: 'cover' }}
                                        />
                                    </>
                                ) : (
                                    <div className={styles.modal_processing}>Processing...</div>
                                )}
                                <div className={styles.card_content}>
                                    <p className={styles.card_name}>{card.name}</p>
                                    <p className={styles.card_text}>{card.flavorText}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
