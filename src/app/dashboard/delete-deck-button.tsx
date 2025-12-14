'use client';

import { useTransition } from 'react';
import { deleteDeckAction } from './actions';
import styles from './dashboard.module.css';

export default function DeleteDeckButton({ deckId }: { deckId: number }) {
    const [isPending, startTransition] = useTransition();

    const handleDelete = () => {
        if (!confirm('Are you sure you want to delete this deck? This cannot be undone.')) return;
        startTransition(async () => {
            try {
                await deleteDeckAction(deckId);
            } catch (e) {
                alert('Failed to delete deck');
            }
        });
    };

    return (
        <button
            onClick={handleDelete}
            disabled={isPending}
            className={styles.delete_btn}
            title="Delete Deck"
        >
            {isPending ? '...' : '🗑️'}
        </button>
    );
}
