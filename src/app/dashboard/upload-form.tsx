'use client';

import { useState } from 'react';
import { createDeckAction } from './actions';
import styles from './dashboard.module.css';

export default function UploadForm() {
    const [fileName, setFileName] = useState<string | null>(null);
    const [isPending, setIsPending] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFileName(e.target.files[0].name);
        }
    };

    const handleSubmit = async (formData: FormData) => {
        setIsPending(true);
        try {
            await createDeckAction(formData);
        } catch (error) {
            console.error("Upload failed", error);
            // Handle error toast usually
        } finally {
            setIsPending(false);
            setFileName(null);
        }
    };

    return (
        <form action={handleSubmit} className={styles.upload_group}>
            <label htmlFor="file-upload" className={styles.new_deck_btn} style={{ cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.7 : 1 }}>
                {isPending ? 'Generating...' : '+ Start New Deck'}
            </label>
            <input
                id="file-upload"
                name="manifest"
                type="file"
                accept=".json"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                required
            />
            {fileName && <span className={styles.file_name}>{fileName} selected - Click to Generate</span>}

            {/* If file is selected, we could show a separate submit, or just click the label again? 
                 Actually, standard pattern: 
                 1. Label triggers input.
                 2. Input has onChange -> set state.
                 3. Show "Generate" button once file is ready.
             */}

            {fileName && !isPending && (
                <button type="submit" className={styles.generate_confirm_btn}>
                    Generate from {fileName}
                </button>
            )}
        </form>
    );
}
