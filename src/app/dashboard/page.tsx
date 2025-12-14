import { currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';
import { createDeckAction } from './actions';
import { db } from '@/db';
import { decks } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import styles from './dashboard.module.css';
import UploadForm from './upload-form';
import DeleteDeckButton from './delete-deck-button';

export default async function DashboardPage() {
    const user = await currentUser();

    let userDecks: typeof decks.$inferSelect[] = [];

    if (user?.id) {
        userDecks = await db.select().from(decks).where(eq(decks.userId, user.id)).orderBy(desc(decks.createdAt));
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.title_group}>
                    <h1>Dashboard</h1>
                    <p className={styles.welcome}>Ready to close deals, {user?.firstName || 'Agent'}?</p>
                </div>
                <UploadForm />
            </div>

            <div className={styles.grid}>
                {userDecks.length === 0 ? (
                    <div className={styles.empty_state}>
                        <p>No decks generated yet.</p>
                        <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Start by clicking the generate button.</p>
                    </div>
                ) : (
                    userDecks.map(deck => {
                        // Status Badge Logic
                        const statusClass = deck.status === 'completed' ? styles.status_completed
                            : deck.status === 'failed' ? styles.status_failed
                                : styles.status_generating;

                        return (
                            <div key={deck.id} className={styles.deck_card}>
                                <div>
                                    <div className={styles.deck_header}>
                                        <h2 className={styles.deck_name}>{deck.name}</h2>
                                        <span className={`${styles.status_badge} ${statusClass}`}>
                                            {deck.status}
                                        </span>
                                        <DeleteDeckButton deckId={deck.id} />
                                    </div>
                                    <p className={styles.meta}>Created: {deck.createdAt.toLocaleDateString()}</p>
                                </div>
                                <Link href={`/library?deckId=${deck.id}`} className={styles.link}>
                                    View Deck &rarr;
                                </Link>
                            </div>
                        );
                    })
                )}
            </div>

            <div style={{ marginTop: '2rem' }}>
                <Link href="/library" className={styles.footer_link}>Go to Library &rarr;</Link>
            </div>
        </div>
    );
}
