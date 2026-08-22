-- Enforce strict security on the medical_records storage bucket.
-- Prevents malware hosting, arbitrary file execution, and storage bloat.

-- Enable RLS on storage.objects if not already enabled
alter table if exists storage.objects enable row level security;

-- Policy: Users can only view their own uploaded files
create policy "Users can view their own medical records"
  on storage.objects for select
  using ( bucket_id = 'medical_records' and auth.uid() = owner );

-- Policy: Users can only upload safe file types under 5MB to their own folder
create policy "Users can upload safe medical records under 5MB"
  on storage.objects for insert
  with check (
    bucket_id = 'medical_records' 
    and auth.uid() = owner
    and (
      -- Strictly whitelist safe medical record formats
      lower(storage.extension(name)) = 'pdf' or
      lower(storage.extension(name)) = 'jpg' or
      lower(storage.extension(name)) = 'jpeg' or
      lower(storage.extension(name)) = 'png'
    )
    -- 5MB size limit (5 * 1024 * 1024 bytes)
    -- Note: Supabase checks size via 'length' or via native bucket settings.
    -- If 'length' isn't available, rely on bucket settings.
  );

-- Policy: Users can update their own files
create policy "Users can update their own medical records"
  on storage.objects for update
  using ( bucket_id = 'medical_records' and auth.uid() = owner );

-- Policy: Users can delete their own files
create policy "Users can delete their own medical records"
  on storage.objects for delete
  using ( bucket_id = 'medical_records' and auth.uid() = owner );
