-- Restore lost entitlements caused by the PostgREST upsert bug.
-- This script safely reapplies the is_pro status to any user who
-- has a valid, unexpired payment in the secure payments ledger.
update public.profiles
set is_pro = true,
    pro_expires_at = payments.entitlement_expires_at
from public.payments
where public.profiles.id = public.payments.user_id
  and public.payments.status = 'paid'
  and public.payments.entitlement_expires_at > now()
  and public.profiles.is_pro = false;
