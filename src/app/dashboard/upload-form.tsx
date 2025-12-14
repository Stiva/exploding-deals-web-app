'use client';

import { useState } from 'react';
import { createDeckAction } from './actions';
import styles from './dashboard.module.css';

export default function UploadForm() {
    const [file, setFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [stats, setStats] = useState<{ count: number; name: string } | null>(null);
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFileName(selectedFile.name);
        setFile(selectedFile);
        setError(null);
        setStats(null);

        // Client-side Validation & Recap
        try {
            const text = await selectedFile.text();
            const json = JSON.parse(text);

            let count = 0;
            let name = "Unknown Deck";

            if (Array.isArray(json)) {
                count = json.length;
                name = "Unnamed Deck List";
            } else if (json.cards && Array.isArray(json.cards)) {
                count = json.cards.length;
                name = json.deck_name || "Custom Deck";
            } else {
                throw new Error("Invalid Format: Must contains 'cards' array");
            }

            setStats({ count, name });
        } catch (err) {
            console.error(err);
            setError("Invalid JSON File");
            setFile(null);
        }
    };

    const handleSubmit = async (formData: FormData) => {
        if (!file) return;
        setIsPending(true);
        try {
            // We append the file to formData manually if not present, but 
            // since it's an input inside the form, it should be there.
            // However, we want to ensure we submit the VALID file.
            await createDeckAction(formData);
        } catch (error) {
            console.error("Upload failed", error);
            setError("Server Error during Generation");
        } finally {
            // We might not reach here if we redirect/refresh
            setIsPending(false);
        }
    };

    return (
        <form action={handleSubmit} className={styles.upload_group}>
            {/* 1. File Input */}
            <label htmlFor="file-upload" className={styles.new_deck_btn} style={{ opacity: isPending ? 0.5 : 1, pointerEvents: isPending ? 'none' : 'auto' }}>
                {isPending ? 'Processing...' : (stats ? 'Change File' : '+ Upload Deck JSON')}
            </label>
            <input
                id="file-upload"
                name="manifest"
                type="file"
                accept=".json"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                disabled={isPending}
            />

            {/* 2. Feedback / Stats */}
            {error && <div style={{ color: '#ff4444', marginTop: '0.5rem' }}>{error}</div>}

            {stats && !isPending && (
                <div className={styles.recap_card}>
                    <p><strong>Deck:</strong> {stats.name}</p>
                    <p><strong>Cards:</strong> {stats.count}</p>
                    <p style={{ fontSize: '0.8em', color: '#888' }}>Ready to generate. This may take a minute.</p>
                </div>
            )}

            {/* 3. Confirm Action */}
            {stats && !isPending && (
                <button type="submit" className={styles.generate_confirm_btn}>
                    🚀 Generate {stats.count} Cards
                </button>
            )}

            {/* 4. Progress State */}
            {isPending && (
                <div className={styles.progress_indicator}>
                    <p>Generating Deck...</p>
                    <p style={{ fontSize: '0.8rem', color: '#666' }}>Validating JSON &bull; Generating Images &bull; Saving Database</p>
                </div>
            )}
        </form>
    );
}
