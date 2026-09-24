-- Boma initial Supabase schema
-- Foundation for households, bills, tasks, shopping lists, meal planning, and petty cash.

create extension if not exists pgcrypto;

create schema if not exists boma;

create type public.household_member_role as enum (
  'owner',
  'admin',
  'adult',
  'staff',
  'nanny',
  'child'
);

create type public.household_member_status as enum (
  'invited',
  'active',
  'inactive'
);

create type public.bill_status as enum (
  'upcoming',
  'paid',
  'overdue',
  'cancelled'
);

create type public.recurrence_frequency as enum (
  'none',
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'yearly'
);

create type public.task_status as enum (
  'todo',
  'in_progress',
  'done',
  'skipped',
  'cancelled'
);

create type public.task_priority as enum (
  'low',
  'normal',
  'high',
  'urgent'
);

create type public.shopping_item_status as enum (
  'needed',
  'in_cart',
  'purchased',
  'unavailable'
);

create type public.meal_type as enum (
  'breakfast',
  'lunch',
  'dinner',
  'snack'
);

create type public.petty_cash_transaction_type as enum (
  'top_up',
  'expense',
  'adjustment'
);

create or replace function boma.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  locale text not null default 'en-KE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country_code text not null default 'KE',
  currency_code text not null default 'KES',
  timezone text not null default 'Africa/Nairobi',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  role public.household_member_role not null default 'adult',
  status public.household_member_status not null default 'active',
  phone text,
  email text,
  notes text,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint household_members_identity_check check (
    user_id is not null
    or phone is not null
    or email is not null
  ),
  unique (id, household_id)
);

create unique index household_members_user_once
  on public.household_members (household_id, user_id)
  where user_id is not null;

create index household_members_household_id_idx
  on public.household_members (household_id);

create or replace function boma.is_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household_id
      and hm.user_id = auth.uid()
      and hm.status = 'active'
  );
$$;

create or replace function boma.has_household_role(
  target_household_id uuid,
  allowed_roles public.household_member_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household_id
      and hm.user_id = auth.uid()
      and hm.status = 'active'
      and hm.role = any(allowed_roles)
  );
$$;

create or replace function boma.add_household_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_name text;
begin
  select coalesce(p.full_name, new.name || ' Owner')
    into profile_name
  from public.profiles p
  where p.id = new.created_by;

  insert into public.household_members (
    household_id,
    user_id,
    display_name,
    role,
    status,
    joined_at
  )
  values (
    new.id,
    new.created_by,
    coalesce(profile_name, new.name || ' Owner'),
    'owner',
    'active',
    now()
  )
  on conflict do nothing;

  return new;
end;
$$;

create table public.bill_categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  icon text,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  unique (household_id, name)
);

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  category_id uuid references public.bill_categories(id) on delete set null,
  name text not null,
  provider text,
  account_reference text,
  amount numeric(12, 2) not null check (amount >= 0),
  currency_code text not null default 'KES',
  due_date date not null,
  recurrence public.recurrence_frequency not null default 'monthly',
  reminder_days_before integer not null default 3 check (reminder_days_before >= 0),
  status public.bill_status not null default 'upcoming',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  foreign key (category_id, household_id)
    references public.bill_categories(id, household_id)
);

create index bills_household_due_date_idx
  on public.bills (household_id, due_date);

create table public.bill_payments (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null,
  household_id uuid not null references public.households(id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 0),
  paid_on date not null default current_date,
  payment_method text,
  confirmation_reference text,
  receipt_url text,
  notes text,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (bill_id, household_id)
    references public.bills(id, household_id)
    on delete cascade
);

create index bill_payments_household_paid_on_idx
  on public.bill_payments (household_id, paid_on desc);

create table public.household_tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  description text,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'normal',
  assignee_member_id uuid references public.household_members(id) on delete set null,
  due_at timestamptz,
  recurrence public.recurrence_frequency not null default 'none',
  completed_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  foreign key (assignee_member_id, household_id)
    references public.household_members(id, household_id)
);

create index household_tasks_household_due_at_idx
  on public.household_tasks (household_id, due_at);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null,
  household_id uuid not null references public.households(id) on delete cascade,
  body text not null,
  attachment_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (task_id, household_id)
    references public.household_tasks(id, household_id)
    on delete cascade
);

create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null default 'Shopping List',
  store_name text,
  needed_by date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id)
);

create index shopping_lists_household_needed_by_idx
  on public.shopping_lists (household_id, needed_by);

create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null,
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  quantity numeric(10, 2),
  unit text,
  category text,
  estimated_price numeric(12, 2) check (estimated_price is null or estimated_price >= 0),
  actual_price numeric(12, 2) check (actual_price is null or actual_price >= 0),
  status public.shopping_item_status not null default 'needed',
  added_by uuid references auth.users(id) on delete set null,
  purchased_by uuid references auth.users(id) on delete set null,
  purchased_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (list_id, household_id)
    references public.shopping_lists(id, household_id)
    on delete cascade
);

create index shopping_list_items_list_status_idx
  on public.shopping_list_items (list_id, status);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  description text,
  cuisine text,
  prep_minutes integer check (prep_minutes is null or prep_minutes >= 0),
  cook_minutes integer check (cook_minutes is null or cook_minutes >= 0),
  servings integer check (servings is null or servings > 0),
  instructions text,
  source_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  unique (household_id, name)
);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null,
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  quantity numeric(10, 2),
  unit text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (recipe_id, household_id)
    references public.recipes(id, household_id)
    on delete cascade
);

create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  check (ends_on >= starts_on)
);

create index meal_plans_household_dates_idx
  on public.meal_plans (household_id, starts_on, ends_on);

create table public.meal_plan_entries (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null,
  household_id uuid not null references public.households(id) on delete cascade,
  meal_date date not null,
  meal_type public.meal_type not null,
  recipe_id uuid references public.recipes(id) on delete set null,
  title text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meal_plan_entries_content_check check (
    recipe_id is not null
    or title is not null
  ),
  unique (meal_plan_id, meal_date, meal_type),
  foreign key (meal_plan_id, household_id)
    references public.meal_plans(id, household_id)
    on delete cascade,
  foreign key (recipe_id, household_id)
    references public.recipes(id, household_id)
);

create table public.petty_cash_accounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null default 'Household Float',
  currency_code text not null default 'KES',
  current_balance numeric(12, 2) not null default 0,
  low_balance_threshold numeric(12, 2) not null default 1000,
  custodian_member_id uuid references public.household_members(id) on delete set null,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  foreign key (custodian_member_id, household_id)
    references public.household_members(id, household_id),
  unique (household_id, name)
);

create table public.petty_cash_transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  household_id uuid not null references public.households(id) on delete cascade,
  transaction_type public.petty_cash_transaction_type not null,
  amount numeric(12, 2) not null check (amount > 0),
  merchant text,
  category text,
  description text not null,
  spent_on date not null default current_date,
  receipt_url text,
  recorded_by_member_id uuid references public.household_members(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (account_id, household_id)
    references public.petty_cash_accounts(id, household_id)
    on delete cascade,
  foreign key (recorded_by_member_id, household_id)
    references public.household_members(id, household_id)
);

create index petty_cash_transactions_account_spent_on_idx
  on public.petty_cash_transactions (account_id, spent_on desc);

create or replace function boma.apply_petty_cash_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.petty_cash_accounts
    set current_balance = current_balance + case
      when new.transaction_type = 'top_up' then new.amount
      when new.transaction_type = 'expense' then -new.amount
      else new.amount
    end
    where id = new.account_id;
  end if;

  return new;
end;
$$;

create or replace function boma.prevent_petty_cash_ledger_mutation()
returns trigger
language plpgsql
as $$
begin
  if old.account_id is distinct from new.account_id
    or old.household_id is distinct from new.household_id
    or old.transaction_type is distinct from new.transaction_type
    or old.amount is distinct from new.amount then
    raise exception 'Petty cash ledger entries are immutable. Create an adjustment transaction instead.';
  end if;

  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function boma.set_updated_at();

create trigger households_set_updated_at
before update on public.households
for each row execute function boma.set_updated_at();

create trigger households_add_owner
after insert on public.households
for each row execute function boma.add_household_owner();

create trigger household_members_set_updated_at
before update on public.household_members
for each row execute function boma.set_updated_at();

create trigger bill_categories_set_updated_at
before update on public.bill_categories
for each row execute function boma.set_updated_at();

create trigger bills_set_updated_at
before update on public.bills
for each row execute function boma.set_updated_at();

create trigger bill_payments_set_updated_at
before update on public.bill_payments
for each row execute function boma.set_updated_at();

create trigger household_tasks_set_updated_at
before update on public.household_tasks
for each row execute function boma.set_updated_at();

create trigger task_comments_set_updated_at
before update on public.task_comments
for each row execute function boma.set_updated_at();

create trigger shopping_lists_set_updated_at
before update on public.shopping_lists
for each row execute function boma.set_updated_at();

create trigger shopping_list_items_set_updated_at
before update on public.shopping_list_items
for each row execute function boma.set_updated_at();

create trigger recipes_set_updated_at
before update on public.recipes
for each row execute function boma.set_updated_at();

create trigger recipe_ingredients_set_updated_at
before update on public.recipe_ingredients
for each row execute function boma.set_updated_at();

create trigger meal_plans_set_updated_at
before update on public.meal_plans
for each row execute function boma.set_updated_at();

create trigger meal_plan_entries_set_updated_at
before update on public.meal_plan_entries
for each row execute function boma.set_updated_at();

create trigger petty_cash_accounts_set_updated_at
before update on public.petty_cash_accounts
for each row execute function boma.set_updated_at();

create trigger petty_cash_transactions_set_updated_at
before update on public.petty_cash_transactions
for each row execute function boma.set_updated_at();

create trigger petty_cash_transactions_prevent_ledger_mutation
before update on public.petty_cash_transactions
for each row execute function boma.prevent_petty_cash_ledger_mutation();

create trigger petty_cash_transactions_apply_balance
after insert on public.petty_cash_transactions
for each row execute function boma.apply_petty_cash_transaction();

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.bill_categories enable row level security;
alter table public.bills enable row level security;
alter table public.bill_payments enable row level security;
alter table public.household_tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.shopping_list_items enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.meal_plans enable row level security;
alter table public.meal_plan_entries enable row level security;
alter table public.petty_cash_accounts enable row level security;
alter table public.petty_cash_transactions enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "Users can update their own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Members can read households"
  on public.households for select
  using (boma.is_household_member(id));

create policy "Authenticated users can create households"
  on public.households for insert
  with check (auth.uid() = created_by);

create policy "Owners and admins can update households"
  on public.households for update
  using (boma.has_household_role(id, array['owner', 'admin']::public.household_member_role[]))
  with check (boma.has_household_role(id, array['owner', 'admin']::public.household_member_role[]));

create policy "Members can read household members"
  on public.household_members for select
  using (boma.is_household_member(household_id));

create policy "Owners and admins can manage household members"
  on public.household_members for all
  using (boma.has_household_role(household_id, array['owner', 'admin']::public.household_member_role[]))
  with check (boma.has_household_role(household_id, array['owner', 'admin']::public.household_member_role[]));

create policy "Members can manage bill categories"
  on public.bill_categories for all
  using (boma.is_household_member(household_id))
  with check (boma.is_household_member(household_id));

create policy "Members can manage bills"
  on public.bills for all
  using (boma.is_household_member(household_id))
  with check (boma.is_household_member(household_id));

create policy "Members can manage bill payments"
  on public.bill_payments for all
  using (boma.is_household_member(household_id))
  with check (boma.is_household_member(household_id));

create policy "Members can manage tasks"
  on public.household_tasks for all
  using (boma.is_household_member(household_id))
  with check (boma.is_household_member(household_id));

create policy "Members can manage task comments"
  on public.task_comments for all
  using (boma.is_household_member(household_id))
  with check (boma.is_household_member(household_id));

create policy "Members can manage shopping lists"
  on public.shopping_lists for all
  using (boma.is_household_member(household_id))
  with check (boma.is_household_member(household_id));

create policy "Members can manage shopping list items"
  on public.shopping_list_items for all
  using (boma.is_household_member(household_id))
  with check (boma.is_household_member(household_id));

create policy "Members can manage recipes"
  on public.recipes for all
  using (boma.is_household_member(household_id))
  with check (boma.is_household_member(household_id));

create policy "Members can manage recipe ingredients"
  on public.recipe_ingredients for all
  using (boma.is_household_member(household_id))
  with check (boma.is_household_member(household_id));

create policy "Members can manage meal plans"
  on public.meal_plans for all
  using (boma.is_household_member(household_id))
  with check (boma.is_household_member(household_id));

create policy "Members can manage meal plan entries"
  on public.meal_plan_entries for all
  using (boma.is_household_member(household_id))
  with check (boma.is_household_member(household_id));

create policy "Members can read petty cash accounts"
  on public.petty_cash_accounts for select
  using (boma.is_household_member(household_id));

create policy "Owners and admins can manage petty cash accounts"
  on public.petty_cash_accounts for all
  using (boma.has_household_role(household_id, array['owner', 'admin']::public.household_member_role[]))
  with check (boma.has_household_role(household_id, array['owner', 'admin']::public.household_member_role[]));

create policy "Members can read petty cash transactions"
  on public.petty_cash_transactions for select
  using (boma.is_household_member(household_id));

create policy "Members can create petty cash transactions"
  on public.petty_cash_transactions for insert
  with check (boma.is_household_member(household_id));

create policy "Owners and admins can update petty cash transactions"
  on public.petty_cash_transactions for update
  using (boma.has_household_role(household_id, array['owner', 'admin']::public.household_member_role[]))
  with check (boma.has_household_role(household_id, array['owner', 'admin']::public.household_member_role[]));
