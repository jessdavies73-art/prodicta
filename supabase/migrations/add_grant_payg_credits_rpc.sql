-- Atomic, all-or-nothing credit grant for the PAYG signup flow. Replaces the
-- previous JS-side per-row upsert loop in
-- /api/billing/create-payg-with-bundle and /api/billing/confirm-payg-bundle.
-- The loop was non-transactional: if the second row write hit a transient
-- error, the first row was committed and the customer ended up with a
-- partial credit grant (paid for 13, got 10).
--
-- This function takes a JSONB array of { credit_type, quantity } entries
-- and upserts one row per credit_type inside a single PL/pgSQL function.
-- Any error inside the loop raises and rolls back every prior insert from
-- the same call. The webhook handler relies on this to safely re-attempt
-- a failed grant on payment_intent.succeeded delivery.
--
-- Idempotency note: the ON CONFLICT branch overwrites credits_remaining and
-- credits_purchased with the requested quantity, NOT additively. This is
-- specifically correct for SIGNUP grants, where the row either does not
-- exist (first attempt) or matches an earlier grant of the same intent
-- (retry). The webhook recovery path only invokes this RPC when the
-- (user_id, credit_type) row is missing, so it never overwrites a row
-- whose credits_remaining has already been spent down by a real user
-- action. The existing top-up flow uses the additive grantCredits helper
-- in /api/billing/webhook/route.js, not this RPC.
--
-- security definer + explicit search_path so the function bypasses RLS
-- safely without inheriting the caller's search_path.
create or replace function public.grant_payg_credits(
  user_id_input uuid,
  purchases_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  purchase jsonb;
  ct text;
  qty integer;
  result jsonb := '[]'::jsonb;
  row_data jsonb;
begin
  if user_id_input is null then
    raise exception 'grant_payg_credits: user_id_input is required';
  end if;
  if purchases_input is null or jsonb_typeof(purchases_input) <> 'array' then
    raise exception 'grant_payg_credits: purchases_input must be a JSONB array';
  end if;
  if jsonb_array_length(purchases_input) = 0 then
    raise exception 'grant_payg_credits: purchases_input must contain at least one entry';
  end if;

  for purchase in select * from jsonb_array_elements(purchases_input)
  loop
    ct := purchase->>'credit_type';
    qty := nullif(purchase->>'quantity', '')::integer;

    if ct is null or ct = '' then
      raise exception 'grant_payg_credits: each entry must include credit_type';
    end if;
    if qty is null or qty < 1 then
      raise exception 'grant_payg_credits: invalid quantity for %: %', ct, qty;
    end if;

    insert into public.assessment_credits
      (user_id, credit_type, credits_remaining, credits_purchased, last_purchased_at)
    values
      (user_id_input, ct, qty, qty, now())
    on conflict (user_id, credit_type) do update
      set credits_remaining = excluded.credits_remaining,
          credits_purchased = excluded.credits_purchased,
          last_purchased_at = excluded.last_purchased_at;

    select to_jsonb(ac) into row_data
    from public.assessment_credits ac
    where ac.user_id = user_id_input and ac.credit_type = ct;

    result := result || jsonb_build_array(row_data);
  end loop;

  return result;
end;
$$;

grant execute on function public.grant_payg_credits(uuid, jsonb) to service_role;
