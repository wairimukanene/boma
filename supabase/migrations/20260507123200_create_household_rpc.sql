create or replace function public.create_household_for_current_user(
  household_name text,
  p_country_code text default 'KE',
  p_currency_code text default 'KES',
  p_timezone text default 'Africa/Nairobi'
)
returns table (
  id uuid,
  name text,
  currency_code text,
  timezone text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  created_household public.households;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to create a household.';
  end if;

  if nullif(trim(household_name), '') is null then
    raise exception 'Household name is required.';
  end if;

  insert into public.households (
    name,
    country_code,
    currency_code,
    timezone,
    created_by
  )
  values (
    trim(household_name),
    p_country_code,
    p_currency_code,
    p_timezone,
    current_user_id
  )
  returning * into created_household;

  return query
  select
    created_household.id,
    created_household.name,
    created_household.currency_code,
    created_household.timezone,
    created_household.created_at;
end;
$$;

grant execute on function public.create_household_for_current_user(
  text,
  text,
  text,
  text
) to authenticated;
