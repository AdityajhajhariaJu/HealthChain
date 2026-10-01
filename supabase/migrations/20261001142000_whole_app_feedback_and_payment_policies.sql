-- Feedback belongs to the authenticated sender or to an anonymous guest.
-- Never let a sender attribute feedback to a different account.
drop policy if exists "Users can insert feedback" on public.user_feedback;
create policy "Users can insert feedback" on public.user_feedback
  for insert to anon, authenticated
  with check (user_id = (select auth.uid()) or (user_id is null and (select auth.uid()) is null));
drop policy if exists "Users can read own feedback" on public.user_feedback;
create policy "Users can read own feedback" on public.user_feedback
  for select to authenticated using (user_id = (select auth.uid()));

-- The two legacy payment policies were identical; keep one owner read policy.
drop policy if exists "Users can view own payments" on public.payments;
drop policy if exists "Users can view their own payments" on public.payments;
create policy "Users can view own payments" on public.payments
  for select to authenticated using (user_id = (select auth.uid()));

create index if not exists idx_payments_owner_created on public.payments(user_id, created_at desc);
create index if not exists idx_feedback_owner_created on public.user_feedback(user_id, created_at desc);
