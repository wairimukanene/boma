"use client";

import { createBomaSupabaseClient, hasSupabaseConfig } from "@boma/shared";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase =
  hasSupabaseConfig(supabaseUrl, supabaseAnonKey) && supabaseUrl && supabaseAnonKey
    ? createBomaSupabaseClient(supabaseUrl, supabaseAnonKey)
    : null;

export default function HomePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isContinuingAnonymously, setIsContinuingAnonymously] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(Boolean(supabase));

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      if (!supabase) {
        setIsCheckingSession(false);
        return;
      }

      const { data } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (data.session) {
        router.replace("/bills");
        return;
      }

      setIsCheckingSession(false);
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

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
        emailRedirectTo: `${window.location.origin}/bills`
      }
    });

    setIsSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    setMessage("Check your email. The sign-in link will open your bills page.");
  }

  async function continueAnonymously() {
    setError(null);
    setMessage(null);

    if (!supabase) {
      setError("Add Supabase environment variables before signing in.");
      return;
    }

    setIsContinuingAnonymously(true);

    const { error: signInError } = await supabase.auth.signInAnonymously();

    setIsContinuingAnonymously(false);

    if (signInError) {
      setError(
        `${signInError.message}. Enable Anonymous Sign-ins in Supabase Auth settings, or wait for the email rate limit to reset.`
      );
      return;
    }

    router.replace("/bills");
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto grid max-w-5xl gap-8 rounded-[2rem] border border-[#d8d2c3] bg-[#fbf6ec] p-8 shadow-sm lg:grid-cols-[1fr_380px]">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#6f8064]">
            Welcome to Boma
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-[#1d1a16] md:text-6xl">
            Sign in to run your household from one place.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#71675c]">
            Start with bills, then grow into chores, shopping, meals, staff,
            school, and petty cash. After authentication, Boma takes you straight
            to the bills tracker.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {["Bills", "Tasks", "Shopping", "Meals"].map((module) => (
              <div
                className="rounded-3xl border border-[#d8d2c3] bg-white p-5"
                key={module}
              >
                <p className="text-sm text-[#71675c]">Phase 1</p>
                <h2 className="mt-2 text-xl font-semibold">{module}</h2>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-[#d8d2c3] bg-white p-6">
          <h2 className="text-2xl font-bold">Sign in</h2>
          <p className="mt-2 text-sm leading-6 text-[#71675c]">
            Continue without email while we are developing, or use a magic link
            once Supabase email limits reset.
          </p>

          {isCheckingSession ? (
            <p className="mt-6 text-sm text-[#71675c]">
              Checking your session...
            </p>
          ) : (
            <form className="mt-6 grid gap-4" onSubmit={sendMagicLink}>
              <button
                className="rounded-full bg-[#6f8064] px-5 py-3 font-semibold text-white transition hover:bg-[#3f513a] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting || isContinuingAnonymously}
                onClick={continueAnonymously}
                type="button"
              >
                {isContinuingAnonymously
                  ? "Opening Boma..."
                  : "Continue without email"}
              </button>

              <p className="rounded-2xl bg-[#eef3e8] p-3 text-xs leading-5 text-[#71675c]">
                Use this now to avoid Supabase email rate limits. If it fails,
                enable Anonymous Sign-ins in Supabase Auth settings.
              </p>

              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-[#71675c]">
                <span className="h-px flex-1 bg-[#d8d2c3]" />
                or email
                <span className="h-px flex-1 bg-[#d8d2c3]" />
              </div>

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
                className="rounded-full border border-[#d8d2c3] px-5 py-3 font-semibold text-[#3f513a] transition hover:border-[#6f8064] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting || isContinuingAnonymously}
                type="submit"
              >
                {isSubmitting ? "Sending..." : "Send sign-in link"}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
