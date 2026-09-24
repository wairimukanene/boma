"use client";

import {
  type Bill,
  createBomaSupabaseClient,
  demoBills,
  formatMoney,
  getBillTotal,
  hasSupabaseConfig
} from "@boma/shared";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase =
  hasSupabaseConfig(supabaseUrl, supabaseAnonKey) && supabaseUrl && supabaseAnonKey
    ? createBomaSupabaseClient(supabaseUrl, supabaseAnonKey)
    : null;

type BillFormState = {
  name: string;
  provider: string;
  amount: string;
  dueDate: string;
};

const initialBillForm: BillFormState = {
  name: "",
  provider: "",
  amount: "",
  dueDate: ""
};

type AuthSession = {
  user: {
    id: string;
    email?: string;
  };
};

type Household = {
  id: string;
  name: string;
  currency_code: string;
  timezone: string;
  created_at: string;
};

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [form, setForm] = useState(initialBillForm);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState("");
  const [newHouseholdName, setNewHouseholdName] = useState("My Boma");
  const [isAuthLoading, setIsAuthLoading] = useState(Boolean(supabase));
  const [isHouseholdLoading, setIsHouseholdLoading] = useState(false);
  const [isBillLoading, setIsBillLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);

  const selectedHousehold = households.find(
    (household) => household.id === selectedHouseholdId
  );
  const visibleBills = session && selectedHousehold ? bills : demoBills;
  const monthlyTotal = useMemo(() => getBillTotal(visibleBills), [visibleBills]);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      if (!supabase) {
        setIsAuthLoading(false);
        setIsBillLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();

      if (isMounted) {
        setSession(data.session as AuthSession | null);
        setIsAuthLoading(false);
      }
    }

    loadSession();

    const {
      data: { subscription }
    } =
      supabase?.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession as AuthSession | null);
      }) ?? { data: { subscription: null } };

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadHouseholds() {
      if (!supabase || !session) {
        setHouseholds([]);
        setSelectedHouseholdId("");
        setBills([]);
        return;
      }

      setIsHouseholdLoading(true);
      setError(null);

      const { data, error: loadError } = await supabase
        .from("households")
        .select("id, name, currency_code, timezone, created_at")
        .order("created_at", { ascending: true });

      if (!isMounted) {
        return;
      }

      setIsHouseholdLoading(false);

      if (loadError) {
        setError(loadError.message);
        return;
      }

      const nextHouseholds = (data ?? []) as Household[];
      setHouseholds(nextHouseholds);
      setSelectedHouseholdId((currentHouseholdId) => {
        if (
          currentHouseholdId &&
          nextHouseholds.some((household) => household.id === currentHouseholdId)
        ) {
          return currentHouseholdId;
        }

        return nextHouseholds[0]?.id ?? "";
      });
    }

    loadHouseholds();

    return () => {
      isMounted = false;
    };
  }, [session]);

  useEffect(() => {
    let isMounted = true;

    async function loadBills() {
      if (!supabase || !session || !selectedHouseholdId) {
        setBills([]);
        setIsBillLoading(false);
        return;
      }

      setIsBillLoading(true);
      setError(null);

      const { data, error: loadError } = await supabase
        .from("bills")
        .select("*")
        .eq("household_id", selectedHouseholdId)
        .order("due_date", { ascending: true });

      if (!isMounted) {
        return;
      }

      if (loadError) {
        setError(loadError.message);
      } else {
        setBills(
          (data ?? []).map((bill) => ({
            ...bill,
            amount: Number(bill.amount)
          })) as Bill[]
        );
      }

      setIsBillLoading(false);
    }

    loadBills();

    return () => {
      isMounted = false;
    };
  }, [selectedHouseholdId, session]);

  async function signOut() {
    await supabase?.auth.signOut();
    setSession(null);
    setBills([]);
    setHouseholds([]);
    setSelectedHouseholdId("");
  }

  async function createHousehold(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!supabase || !session) {
      setError("Sign in before creating a household.");
      return;
    }

    if (!newHouseholdName.trim()) {
      setError("Household name is required.");
      return;
    }

    const { data, error: insertError } = await supabase
      .rpc("create_household_for_current_user", {
        household_name: newHouseholdName.trim(),
        p_country_code: "KE",
        p_currency_code: "KES",
        p_timezone: "Africa/Nairobi"
      })
      .single();

    if (insertError) {
      setError(insertError.message);
      return;
    }

    const household = data as Household;
    setHouseholds((currentHouseholds) => [...currentHouseholds, household]);
    setSelectedHouseholdId(household.id);
    setNewHouseholdName("My Boma");
  }

  async function createBill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!supabase) {
      setError("Add Supabase environment variables before saving bills.");
      return;
    }

    if (!session) {
      setError("Sign in before saving bills.");
      return;
    }

    if (!selectedHouseholdId) {
      setError("Create or select a household before saving bills.");
      return;
    }

    if (!form.name || !form.amount || !form.dueDate) {
      setError("Bill name, amount, and due date are required.");
      return;
    }

    const { data, error: insertError } = await supabase
      .from("bills")
      .insert({
        household_id: selectedHouseholdId,
        name: form.name,
        provider: form.provider || null,
        amount: Number(form.amount),
        due_date: form.dueDate,
        currency_code: "KES",
        recurrence: "monthly",
        status: "upcoming"
      })
      .select("*")
      .single();

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setBills((currentBills) => [
      ...currentBills,
      {
        ...data,
        amount: Number(data.amount)
      } as Bill
    ]);
    setForm(initialBillForm);
  }

  return (
    <main className="min-h-screen px-6 py-8">
      <section className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_380px]">
        <div className="rounded-[2rem] border border-[#d8d2c3] bg-[#fbf6ec] p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6f8064]">
                Bills Tracker
              </p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight">
                Keep household payments visible.
              </h1>
              <p className="mt-3 max-w-2xl leading-7 text-[#71675c]">
                Track rent, utilities, school-related payments, internet, gas,
                and token top-ups in one place.
              </p>
              {selectedHousehold ? (
                <p className="mt-3 text-sm font-semibold text-[#3f513a]">
                  Viewing {selectedHousehold.name}
                </p>
              ) : null}
            </div>
            <div className="rounded-3xl bg-white p-5 text-right shadow-sm">
              <p className="text-sm text-[#71675c]">Upcoming total</p>
              <p className="mt-1 text-3xl font-bold">
                {formatMoney(monthlyTotal)}
              </p>
            </div>
          </div>

          {error ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          {!supabase ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Showing demo data. Add `NEXT_PUBLIC_SUPABASE_URL` and
              `NEXT_PUBLIC_SUPABASE_ANON_KEY` to load live bills.
            </div>
          ) : null}

          <div className="mt-8 grid gap-4">
            {isBillLoading || isAuthLoading ? (
              <p className="text-[#71675c]">Loading bills...</p>
            ) : session && selectedHousehold && visibleBills.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#6f8064] bg-white p-6 text-[#71675c]">
                No bills yet. Add the first household bill from the form.
              </div>
            ) : (
              visibleBills.map((bill) => (
                <article
                  className="flex flex-col gap-4 rounded-3xl border border-[#d8d2c3] bg-white p-5 md:flex-row md:items-center md:justify-between"
                  key={bill.id}
                >
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.16em] text-[#71675c]">
                      Due {bill.due_date}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold">{bill.name}</h2>
                    <p className="mt-1 text-[#71675c]">
                      {[bill.provider, bill.recurrence].filter(Boolean).join(" • ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-[#eef3e8] px-4 py-2 text-sm font-semibold capitalize text-[#3f513a]">
                      {bill.status}
                    </span>
                    <p className="text-2xl font-bold">
                      {formatMoney(Number(bill.amount), bill.currency_code)}
                    </p>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        <aside className="rounded-[2rem] border border-[#d8d2c3] bg-white p-6 shadow-sm">
          <div className="mb-8 border-b border-[#d8d2c3] pb-8">
            <h2 className="text-2xl font-bold">Account</h2>
            {session ? (
              <div className="mt-4 grid gap-3">
                <p className="text-sm text-[#71675c]">
                  Signed in as {session.user.email ?? "Boma user"}.
                </p>
                <button
                  className="rounded-full border border-[#d8d2c3] px-5 py-3 font-semibold text-[#3f513a]"
                  onClick={signOut}
                  type="button"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                <p className="text-sm leading-6 text-[#71675c]">
                  Sign in first, then Boma will bring you back to this bills
                  page.
                </p>
                <Link
                  className="rounded-full bg-[#1d1a16] px-5 py-3 text-center font-semibold text-white"
                  href="/"
                >
                  Sign in to continue
                </Link>
              </div>
            )}
          </div>

          {session ? (
            <div className="mb-8 border-b border-[#d8d2c3] pb-8">
              <h2 className="text-2xl font-bold">Household</h2>

              {isHouseholdLoading ? (
                <p className="mt-3 text-sm text-[#71675c]">
                  Loading households...
                </p>
              ) : households.length > 0 ? (
                <label className="mt-4 grid gap-2 text-sm font-medium">
                  Selected household
                  <select
                    className="rounded-2xl border border-[#d8d2c3] px-4 py-3"
                    onChange={(event) =>
                      setSelectedHouseholdId(event.target.value)
                    }
                    value={selectedHouseholdId}
                  >
                    {households.map((household) => (
                      <option key={household.id} value={household.id}>
                        {household.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className="mt-3 text-sm leading-6 text-[#71675c]">
                  Create your household once, then bills will attach to it
                  automatically.
                </p>
              )}

              <form className="mt-4 grid gap-3" onSubmit={createHousehold}>
                <label className="grid gap-2 text-sm font-medium">
                  New household name
                  <input
                    className="rounded-2xl border border-[#d8d2c3] px-4 py-3"
                    onChange={(event) => setNewHouseholdName(event.target.value)}
                    placeholder="My Boma"
                    value={newHouseholdName}
                  />
                </label>
                <button
                  className="rounded-full border border-[#6f8064] px-5 py-3 font-semibold text-[#3f513a]"
                  type="submit"
                >
                  Create household
                </button>
              </form>
            </div>
          ) : null}

          <h2 className="text-2xl font-bold">Add a bill</h2>
          <p className="mt-2 text-sm leading-6 text-[#71675c]">
            Bills are saved to the selected household. No UUID entry needed.
          </p>

          <form className="mt-6 grid gap-4" onSubmit={createBill}>
            <label className="grid gap-2 text-sm font-medium">
              Bill name
              <input
                className="rounded-2xl border border-[#d8d2c3] px-4 py-3"
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="KPLC tokens"
                value={form.name}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Provider
              <input
                className="rounded-2xl border border-[#d8d2c3] px-4 py-3"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    provider: event.target.value
                  }))
                }
                placeholder="Kenya Power"
                value={form.provider}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Amount
              <input
                className="rounded-2xl border border-[#d8d2c3] px-4 py-3"
                min="0"
                onChange={(event) =>
                  setForm((current) => ({ ...current, amount: event.target.value }))
                }
                placeholder="2500"
                type="number"
                value={form.amount}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Due date
              <input
                className="rounded-2xl border border-[#d8d2c3] px-4 py-3"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    dueDate: event.target.value
                  }))
                }
                type="date"
                value={form.dueDate}
              />
            </label>

            <button
              className="rounded-full bg-[#6f8064] px-5 py-3 font-semibold text-white transition hover:bg-[#3f513a] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!session || !selectedHouseholdId}
              type="submit"
            >
              Save bill
            </button>
          </form>
        </aside>
      </section>
    </main>
  );
}
