-- Cache the current request's identity once while preserving the same owners,
-- operations and roles. Do not remove indexes based on low recent traffic.
alter policy "Users can record own analytics" on public.analytics_events
  with check (user_id is null or (select auth.uid()) = user_id);
alter policy "Users can insert own case events" on public.case_events
  with check (exists (select 1 from public.cases where cases.id = case_events.case_id and cases.user_id = (select auth.uid())));
alter policy "Users can view own case events" on public.case_events
  using (exists (select 1 from public.cases where cases.id = case_events.case_id and cases.user_id = (select auth.uid())));
alter policy "Users manage own case tombstones" on public.case_tombstones
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "Users manage own caregiver profiles" on public.healthchain_profiles
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "Users own badges" on public.user_badges
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "Users own measurements" on public.user_body_measurements
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "Users own favorites" on public.user_favorites
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "Users own history" on public.user_fitness_history
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "Users own progress" on public.user_program_progress
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "Users own photos" on public.user_progress_photos
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "Users can read own quotas" on public.user_quotas
  using ((select auth.uid()) = user_id);
alter policy "Users own streaks" on public.user_streaks
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create index if not exists idx_case_events_case_id on public.case_events(case_id);
create index if not exists idx_fitness_content_tags_tag_id on public.fitness_content_tags(tag_id);
create index if not exists idx_fitness_program_episodes_content_id on public.fitness_program_episodes(content_id);
create index if not exists idx_fitness_programs_category_id on public.fitness_programs(category_id);
create index if not exists idx_fitness_sport_days_content_id on public.fitness_sport_days(content_id);
create index if not exists idx_user_favorites_content_id on public.user_favorites(content_id);
create index if not exists idx_user_program_progress_program_id on public.user_program_progress(program_id);
create index if not exists idx_user_progress_photos_measurement_id on public.user_progress_photos(measurement_id);
create index if not exists idx_user_progress_photos_owner_taken_at on public.user_progress_photos(user_id,taken_at desc);
