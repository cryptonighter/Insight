-- Create a private bucket for meditation audio
insert into storage.buckets (id, name, public)
values ('meditations', 'meditations', true);

-- Policy: Allow authenticated uploads (users can save their sessions)
create policy "Authenticated users can upload meditation audio"
on storage.objects for insert
with check ( bucket_id = 'meditations' and auth.role() = 'authenticated' );

-- Policy: Allow users to read their own audio (or public if we want sharing)
-- For now, let's make it public readable so the <audio> tag works easily without signed URL complexity for MVP
create policy "Anyone can read meditation audio"
on storage.objects for select
using ( bucket_id = 'meditations' );

-- Policy: Allow users to update their own files
create policy "Users can update own audio"
on storage.objects for update
using ( bucket_id = 'meditations' and auth.uid() = owner );
