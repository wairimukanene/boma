export type BillStatus = "upcoming" | "paid" | "overdue" | "cancelled";

export type RecurrenceFrequency =
  | "none"
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export type Bill = {
  id: string;
  household_id: string;
  category_id: string | null;
  name: string;
  provider: string | null;
  account_reference: string | null;
  amount: number;
  currency_code: string;
  due_date: string;
  recurrence: RecurrenceFrequency;
  reminder_days_before: number;
  status: BillStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type NewBillInput = {
  household_id: string;
  name: string;
  amount: number;
  due_date: string;
  provider?: string;
  category_id?: string;
  currency_code?: string;
  recurrence?: RecurrenceFrequency;
  reminder_days_before?: number;
  notes?: string;
};

export const demoBills: Bill[] = [
  {
    id: "demo-kplc",
    household_id: "demo",
    category_id: null,
    name: "KPLC tokens",
    provider: "Kenya Power",
    account_reference: null,
    amount: 2500,
    currency_code: "KES",
    due_date: "2026-05-10",
    recurrence: "monthly",
    reminder_days_before: 3,
    status: "upcoming",
    notes: "Top up before the weekend.",
    created_at: "2026-05-07T00:00:00.000Z",
    updated_at: "2026-05-07T00:00:00.000Z"
  },
  {
    id: "demo-water",
    household_id: "demo",
    category_id: null,
    name: "Water bill",
    provider: "Nairobi City Water",
    account_reference: null,
    amount: 1800,
    currency_code: "KES",
    due_date: "2026-05-15",
    recurrence: "monthly",
    reminder_days_before: 5,
    status: "upcoming",
    notes: null,
    created_at: "2026-05-07T00:00:00.000Z",
    updated_at: "2026-05-07T00:00:00.000Z"
  },
  {
    id: "demo-internet",
    household_id: "demo",
    category_id: null,
    name: "Home internet",
    provider: "Safaricom",
    account_reference: null,
    amount: 3999,
    currency_code: "KES",
    due_date: "2026-05-20",
    recurrence: "monthly",
    reminder_days_before: 3,
    status: "upcoming",
    notes: null,
    created_at: "2026-05-07T00:00:00.000Z",
    updated_at: "2026-05-07T00:00:00.000Z"
  }
];

export function formatMoney(amount: number, currencyCode = "KES") {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0
  }).format(amount);
}

export function getBillTotal(bills: Bill[]) {
  return bills.reduce((total, bill) => total + Number(bill.amount), 0);
}
