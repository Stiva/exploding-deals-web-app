import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.main}>
      <header className={styles.hero}>
        <h1 className={styles.title}>
          Exploding <span className={styles.highlight}>Deals</span>
        </h1>
        <p className={styles.subtitle}>
          The ultimate card generator for High-Stakes Deal Makers.
          Gamify your sales process with a custom deck designed for Closers.
        </p>

        <div className={styles.cta_group}>
          <SignedOut>
            <SignInButton mode="modal">
              <button className={styles.button_primary}>
                Start Generating
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link
              href="/dashboard"
              className={styles.button_primary}
            >
              Go to Dashboard
            </Link>
          </SignedIn>
        </div>
      </header>
      <footer className={styles.footer}>
        <p>Exploding Deals &copy; {new Date().getFullYear()} &bull; Professional Edition</p>
      </footer>
    </div>
  );
}
