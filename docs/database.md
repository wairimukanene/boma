# Boma Database

Boma is household-first: every operational record belongs to a household, and row-level security checks the authenticated user's active household membership before returning or mutating data.

## Initial Migration

The first migration lives at:

```text
supabase/migrations/20260507090600_initial_boma_schema.sql
```

It creates:

- Core identity tables: `profiles`, `households`, `household_members`
- Phase 1 modules: `bills`, `bill_payments`, `household_tasks`, `shopping_lists`, `shopping_list_items`, `recipes`, `meal_plans`, `meal_plan_entries`
- Petty cash foundation: `petty_cash_accounts`, `petty_cash_transactions`
- Shared enums, timestamp triggers, household membership helpers, and RLS policies

## Apply Locally

From the project root, once Supabase CLI is installed and initialized:

```bash
supabase start
supabase db reset
```

## Apply To Hosted Supabase

Link the project, then push migrations:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

## Design Notes

- `households.created_by` automatically becomes the household `owner` through an insert trigger.
- Household-scoped foreign keys prevent records from referencing data that belongs to another household.
- Petty cash balance is maintained from inserted ledger transactions. Amount, account, household, and transaction type are immutable after insert; corrections should be posted as `adjustment` transactions.
- Staff/nanny users can be represented as `household_members` before they have app login accounts by using phone or email without `user_id`.
- Receipt photos can use Supabase Storage later; the schema currently stores receipt URLs on bill payments and petty cash transactions.
