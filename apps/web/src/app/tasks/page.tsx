"use client";

import {
  type HouseholdTask,
  createBomaSupabaseClient,
  demoTasks,
  getOpenTaskCount,
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

type TaskFormState = {
  title: string;
  description: string;
  dueDate: string;
  priority: "low" | "normal" | "high" | "urgent";
  recurrence: "none" | "daily" | "weekly" | "monthly";
};

const initialTaskForm: TaskFormState = {
  title: "",
  description: "",
  dueDate: "",
  priority: "normal",
  recurrence: "none"
};

export default function TasksPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState("");
  const [newHouseholdName, setNewHouseholdName] = useState("My Boma");
  const [tasks, setTasks] = useState<HouseholdTask[]>([]);
  const [form, setForm] = useState(initialTaskForm);
  const [isAuthLoading, setIsAuthLoading] = useState(Boolean(supabase));
  const [isHouseholdLoading, setIsHouseholdLoading] = useState(false);
  const [isTaskLoading, setIsTaskLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);

  const selectedHousehold = households.find(
    (household) => household.id === selectedHouseholdId
  );
  const visibleTasks = session && selectedHousehold ? tasks : demoTasks;
  const openTaskCount = useMemo(() => getOpenTaskCount(visibleTasks), [visibleTasks]);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      if (!supabase) {
        setIsAuthLoading(false);
        setIsTaskLoading(false);
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
        setTasks([]);
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

    async function loadTasks() {
      if (!supabase || !session || !selectedHouseholdId) {
        setTasks([]);
        setIsTaskLoading(false);
        return;
      }

      setIsTaskLoading(true);
      setError(null);

      const { data, error: loadError } = await supabase
        .from("household_tasks")
        .select("*")
        .eq("household_id", selectedHouseholdId)
        .order("due_at", { ascending: true, nullsFirst: false });

      if (!isMounted) {
        return;
      }

      if (loadError) {
        setError(loadError.message);
      } else {
        setTasks((data ?? []) as HouseholdTask[]);
      }

      setIsTaskLoading(false);
    }

    loadTasks();

    return () => {
      isMounted = false;
    };
  }, [selectedHouseholdId, session]);

  async function signOut() {
    await supabase?.auth.signOut();
    setSession(null);
    setTasks([]);
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

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!supabase) {
      setError("Add Supabase environment variables before saving tasks.");
      return;
    }

    if (!session) {
      setError("Sign in before saving tasks.");
      return;
    }

    if (!selectedHouseholdId) {
      setError("Create or select a household before saving tasks.");
      return;
    }

    if (!form.title.trim()) {
      setError("Task title is required.");
      return;
    }

    const dueAt = form.dueDate ? `${form.dueDate}T09:00:00.000Z` : null;

    const { data, error: insertError } = await supabase
      .from("household_tasks")
      .insert({
        household_id: selectedHouseholdId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        due_at: dueAt,
        priority: form.priority,
        recurrence: form.recurrence,
        status: "todo",
        created_by: session.user.id
      })
      .select("*")
      .single();

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setTasks((currentTasks) => [...currentTasks, data as HouseholdTask]);
    setForm(initialTaskForm);
  }

  async function markTaskDone(task: HouseholdTask) {
    if (!supabase || !session || !selectedHouseholdId) {
      return;
    }

    setError(null);

    const completedAt = new Date().toISOString();
    const { data, error: updateError } = await supabase
      .from("household_tasks")
      .update({
        status: "done",
        completed_at: completedAt,
        completed_by: session.user.id
      })
      .eq("id", task.id)
      .eq("household_id", selectedHouseholdId)
      .select("*")
      .single();

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setTasks((currentTasks) =>
      currentTasks.map((currentTask) =>
        currentTask.id === task.id ? (data as HouseholdTask) : currentTask
      )
    );
  }

  return (
    <main className="min-h-screen px-6 py-8">
      <section className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_380px]">
        <div className="rounded-[2rem] border border-[#d8d2c3] bg-[#fbf6ec] p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6f8064]">
                Tasks & Chores
              </p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight">
                Keep the household moving.
              </h1>
              <p className="mt-3 max-w-2xl leading-7 text-[#71675c]">
                Assign chores, nanny instructions, school prep, and recurring
                routines without chasing messages.
              </p>
              {selectedHousehold ? (
                <p className="mt-3 text-sm font-semibold text-[#3f513a]">
                  Viewing {selectedHousehold.name}
                </p>
              ) : null}
            </div>
            <div className="rounded-3xl bg-white p-5 text-right shadow-sm">
              <p className="text-sm text-[#71675c]">Open tasks</p>
              <p className="mt-1 text-3xl font-bold">{openTaskCount}</p>
            </div>
          </div>

          {error ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          {!supabase ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Showing demo data. Add Supabase env vars to load live tasks.
            </div>
          ) : null}

          <div className="mt-8 grid gap-4">
            {isTaskLoading || isAuthLoading ? (
              <p className="text-[#71675c]">Loading tasks...</p>
            ) : session && selectedHousehold && visibleTasks.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#6f8064] bg-white p-6 text-[#71675c]">
                No tasks yet. Add the first household task from the form.
              </div>
            ) : (
              visibleTasks.map((task) => (
                <article
                  className="flex flex-col gap-4 rounded-3xl border border-[#d8d2c3] bg-white p-5 md:flex-row md:items-center md:justify-between"
                  key={task.id}
                >
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.16em] text-[#71675c]">
                      {task.due_at
                        ? `Due ${new Date(task.due_at).toLocaleDateString("en-KE")}`
                        : "No due date"}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold">{task.title}</h2>
                    <p className="mt-1 text-[#71675c]">
                      {[task.description, task.recurrence].filter(Boolean).join(" • ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-[#eef3e8] px-4 py-2 text-sm font-semibold capitalize text-[#3f513a]">
                      {task.priority}
                    </span>
                    {task.status === "done" ? (
                      <span className="rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-800">
                        Done
                      </span>
                    ) : (
                      <button
                        className="rounded-full bg-[#1d1a16] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!session || !selectedHousehold}
                        onClick={() => markTaskDone(task)}
                        type="button"
                      >
                        Mark done
                      </button>
                    )}
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
                  Signed in as {session.user.email ?? "anonymous Boma user"}.
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
                  Sign in first, then Boma will bring you back to tasks.
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
                  Create your household once, then tasks will attach to it
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

          <h2 className="text-2xl font-bold">Add a task</h2>
          <p className="mt-2 text-sm leading-6 text-[#71675c]">
            Tasks are saved to the selected household automatically.
          </p>

          <form className="mt-6 grid gap-4" onSubmit={createTask}>
            <label className="grid gap-2 text-sm font-medium">
              Task title
              <input
                className="rounded-2xl border border-[#d8d2c3] px-4 py-3"
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Prepare school uniforms"
                value={form.title}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Notes
              <textarea
                className="min-h-24 rounded-2xl border border-[#d8d2c3] px-4 py-3"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value
                  }))
                }
                placeholder="Any instruction the household should know"
                value={form.description}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Due date
              <input
                className="rounded-2xl border border-[#d8d2c3] px-4 py-3"
                onChange={(event) =>
                  setForm((current) => ({ ...current, dueDate: event.target.value }))
                }
                type="date"
                value={form.dueDate}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Priority
              <select
                className="rounded-2xl border border-[#d8d2c3] px-4 py-3"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    priority: event.target.value as TaskFormState["priority"]
                  }))
                }
                value={form.priority}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Repeat
              <select
                className="rounded-2xl border border-[#d8d2c3] px-4 py-3"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    recurrence: event.target.value as TaskFormState["recurrence"]
                  }))
                }
                value={form.recurrence}
              >
                <option value="none">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>

            <button
              className="rounded-full bg-[#6f8064] px-5 py-3 font-semibold text-white transition hover:bg-[#3f513a] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!session || !selectedHouseholdId}
              type="submit"
            >
              Save task
            </button>
          </form>
        </aside>
      </section>
    </main>
  );
}
