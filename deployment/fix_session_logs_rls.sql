-- Enable RLS
alter table session_logs enable row level security;

-- Allow Insert
create policy "Users can insert own logs"
on session_logs for insert
with check ( auth.uid() = user_id );

-- Allow Select
create policy "Users can view own logs"
on session_logs for select
using ( auth.uid() = user_id );

-- Allow Update (CRITICAL FOR FEEDBACK)
create policy "Users can update own logs"
on session_logs for update
using ( auth.uid() = user_id );
