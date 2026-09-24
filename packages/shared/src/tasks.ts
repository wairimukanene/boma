export type TaskStatus = "todo" | "in_progress" | "done" | "skipped" | "cancelled";

export type TaskPriority = "low" | "normal" | "high" | "urgent";

export type HouseholdTask = {
  id: string;
  household_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_member_id: string | null;
  due_at: string | null;
  recurrence: "none" | "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export const demoTasks: HouseholdTask[] = [
  {
    id: "demo-dishes",
    household_id: "demo",
    title: "Wash dinner dishes",
    description: "Clear sink and wipe counters before bedtime.",
    status: "todo",
    priority: "normal",
    assignee_member_id: null,
    due_at: "2026-05-07T20:00:00.000Z",
    recurrence: "daily",
    completed_at: null,
    created_at: "2026-05-07T00:00:00.000Z",
    updated_at: "2026-05-07T00:00:00.000Z"
  },
  {
    id: "demo-uniforms",
    household_id: "demo",
    title: "Prepare school uniforms",
    description: "Iron and set out uniforms for the morning.",
    status: "todo",
    priority: "high",
    assignee_member_id: null,
    due_at: "2026-05-07T19:30:00.000Z",
    recurrence: "weekly",
    completed_at: null,
    created_at: "2026-05-07T00:00:00.000Z",
    updated_at: "2026-05-07T00:00:00.000Z"
  },
  {
    id: "demo-trash",
    household_id: "demo",
    title: "Take out trash",
    description: null,
    status: "done",
    priority: "normal",
    assignee_member_id: null,
    due_at: "2026-05-07T06:30:00.000Z",
    recurrence: "daily",
    completed_at: "2026-05-07T06:20:00.000Z",
    created_at: "2026-05-07T00:00:00.000Z",
    updated_at: "2026-05-07T06:20:00.000Z"
  }
];

export function getOpenTaskCount(tasks: HouseholdTask[]) {
  return tasks.filter((task) => task.status !== "done").length;
}
