"use client";

import { createBomaSupabaseClient, hasSupabaseConfig } from "@boma/shared";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase =
  hasSupabaseConfig(supabaseUrl, supabaseAnonKey) && supabaseUrl && supabaseAnonKey
    ? createBomaSupabaseClient(supabaseUrl, supabaseAnonKey)
    : null;

function LoginForm() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/bills";
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!supabase) {
      setError("Add Supabase environment variables before signing in.");
      return;
    }

    setIsSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}${nextPath}`
      }
    });

    setIsSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    setMessage("Check your email. The sign-in link will open your bills page.");
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto grid max-w-5xl gap-8 rounded-[2rem] border border-[#d8d2c3] bg-[#fbf6ec] p-8 shadow-sm lg:grid-cols-[1fr_380px]">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#6f8064]">
            Welcome to Boma
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-[#1d1a16] md:text-6xl">
            Sign in, then continue to your household bills.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#71675c]">
            Boma uses a secure email link while the product foundation is early.
            After login, the app will take you straight to the bills tracker.
          </p>
        </div>

        <div className="rounded-[2rem] border border-[#d8d2c3] bg-white p-6">
          <h2 className="text-2xl font-bold">Sign in</h2>
          <form className="mt-6 grid gap-4" onSubmit={sendMagicLink}>
            <label className="grid gap-2 text-sm font-medium">
              Email address
              <input
                className="rounded-2xl border border-[#d8d2c3] px-4 py-3"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                {error}
              </div>
            ) : null}

            {message ? (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                {message}
              </div>
            ) : null}

            <button
              className="rounded-full bg-[#6f8064] px-5 py-3 font-semibold text-white transition hover:bg-[#3f513a] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Sending..." : "Send sign-in link"}
            </button>
          </form>

          <Link
            className="mt-4 block text-center text-sm font-semibold text-[#3f513a]"
            href="/"
          >
            Back home
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
