-- Make the intended server-only access explicit for the RLS advisor.
drop policy if exists "HealthChain service metrics" on healthchain_private.product_metric_counts;
create policy "HealthChain service metrics" on healthchain_private.product_metric_counts
  for all to service_role using (true) with check (true);
