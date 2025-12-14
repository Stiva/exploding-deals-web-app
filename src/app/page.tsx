import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          Exploding <span className="text-red-600">Deals</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-lg">
          Genera il tuo mazzo di carte personalizzato per Sales Engineers e Recruiter.
          Ispirato a Exploding Kittens, ottimizzato per il business.
        </p>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="rounded-full bg-red-600 text-white px-8 py-3 font-bold hover:bg-red-700 transition">
                Inizia a Generare
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link
              href="/dashboard"
              className="rounded-full bg-slate-900 text-white px-8 py-3 font-bold hover:bg-slate-800 transition"
            >
              Vai alla Dashboard
            </Link>
          </SignedIn>
        </div>
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center mt-12 text-gray-400">
        <p>Exploding Deals &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
