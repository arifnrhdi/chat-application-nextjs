-- Jalankan sekali di Supabase SQL editor

-- === PROFILES ===
create table profiles (
  id uuid references auth.users primary key,
  email text not null,
  username text unique,
  avatar_url text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "read all profiles" on profiles for select using (true);
create policy "update own profile" on profiles for update using (auth.uid() = id);

create function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email, username)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- === ROOMS ===
create table rooms (
  id bigint generated always as identity primary key,
  name text not null,
  is_group boolean default true,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table room_members (
  room_id bigint references rooms(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (room_id, user_id)
);

-- helper function security definer: cek keanggotaan tanpa memicu RLS
-- recursion (dipanggil dari dalam policy room_members & rooms sendiri)
create function is_room_member(check_room_id bigint, check_user_id uuid) returns boolean as $$
  select exists (
    select 1 from public.room_members
    where room_id = check_room_id and user_id = check_user_id
  );
$$ language sql security definer set search_path = public stable;

alter table rooms enable row level security;
alter table room_members enable row level security;

create policy "member sees own rooms" on rooms for select using (
  is_room_member(id, auth.uid())
);
create policy "auth creates room" on rooms for insert with check (auth.uid() = created_by);

create policy "member sees all members in own rooms" on room_members for select using (
  is_room_member(room_id, auth.uid())
);
create policy "auth joins room" on room_members for insert with check (auth.uid() = user_id);

-- === MESSAGES ===
create table messages (
  id bigint generated always as identity primary key,
  room_id bigint references rooms(id) on delete cascade not null,
  user_id uuid references profiles(id) not null,
  content text,
  file_url text,
  file_type text, -- 'image' | 'video' | 'file'
  created_at timestamptz default now()
);

alter table messages enable row level security;

create policy "member reads messages" on messages for select using (
  is_room_member(room_id, auth.uid())
);
create policy "member sends messages" on messages for insert with check (
  auth.uid() = user_id and is_room_member(room_id, auth.uid())
);

alter publication supabase_realtime add table messages;

-- === STORAGE ===
insert into storage.buckets (id, name, public) values ('chat-files', 'chat-files', true);
create policy "public read files" on storage.objects for select using (bucket_id = 'chat-files');
create policy "auth upload files" on storage.objects for insert with check (bucket_id = 'chat-files' and auth.role() = 'authenticated');

-- === setiap user baru auto-join room "General" ===
create function join_general_room() returns trigger as $$
declare
  general_id bigint;
begin
  select id into general_id from public.rooms where name = 'General' limit 1;
  if general_id is null then
    insert into public.rooms (name, is_group, created_by) values ('General', true, new.id) returning id into general_id;
  end if;
  insert into public.room_members (room_id, user_id) values (general_id, new.id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_profile_created
  after insert on profiles
  for each row execute procedure join_general_room();
