begin;

create table if not exists public.conversation_participants (
  conversation_id bigint not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

create index if not exists idx_conversation_participants_user on public.conversation_participants(user_id);

alter table public.conversation_participants enable row level security;

drop policy if exists "Participants can view membership" on public.conversation_participants;
create policy "Participants can view membership"
  on public.conversation_participants
  for select
  using (
    auth.role() = 'authenticated'
    and (
      user_id = auth.uid()
      or exists (
        select 1
        from public.conversations c
        join public.matches m on m.id = c.match_id
        where c.id = conversation_id
          and (m.user_a = auth.uid() or m.user_b = auth.uid())
      )
    )
  );

drop policy if exists "Participants can join conversations" on public.conversation_participants;
create policy "Participants can join conversations"
  on public.conversation_participants
  for insert
  with check (
    auth.role() = 'authenticated'
    and user_id = auth.uid()
  );

drop policy if exists "Participants can update membership" on public.conversation_participants;
create policy "Participants can update membership"
  on public.conversation_participants
  for update
  using (
    auth.role() = 'authenticated' and user_id = auth.uid()
  )
  with check (
    auth.role() = 'authenticated' and user_id = auth.uid()
  );

drop policy if exists "Participants can leave conversations" on public.conversation_participants;
create policy "Participants can leave conversations"
  on public.conversation_participants
  for delete
  using (
    auth.role() = 'authenticated' and user_id = auth.uid()
  );

create or replace function public.handle_swipe_match()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  pair_a uuid;
  pair_b uuid;
  reciprocal_like boolean;
  match_row_id bigint;
  conv_id bigint;
begin
  if new.direction <> 'like' then
    return new;
  end if;

  pair_a := least(new.swiper_id, new.target_id);
  pair_b := greatest(new.swiper_id, new.target_id);

  select exists(
    select 1 from public.swipes
    where swiper_id = new.target_id
      and target_id = new.swiper_id
      and direction = 'like'
  ) into reciprocal_like;

  if reciprocal_like then
    insert into public.matches (user_a, user_b)
    values (pair_a, pair_b)
    on conflict (user_a, user_b) do nothing;

    select id into match_row_id
    from public.matches
    where user_a = pair_a and user_b = pair_b;

    if match_row_id is not null then
      insert into public.conversations (match_id)
      values (match_row_id)
      on conflict (match_id) do nothing;

      select id into conv_id
      from public.conversations
      where match_id = match_row_id;

      if conv_id is not null then
        insert into public.conversation_participants (conversation_id, user_id)
        values (conv_id, pair_a), (conv_id, pair_b)
        on conflict (conversation_id, user_id) do nothing;
      end if;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.mark_conversation_read(p_conversation_id bigint, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  update public.messages
  set read_at = now()
  where conversation_id = p_conversation_id
    and sender_id <> p_user_id
    and read_at is null;

  update public.conversation_participants
  set last_read_at = now()
  where conversation_id = p_conversation_id
    and user_id = p_user_id;

  insert into public.activity_feed (user_id, type, payload)
  values (p_user_id, 'conversation_read', jsonb_build_object('conversation_id', p_conversation_id, 'recorded_at', now()))
  on conflict do nothing;
end;
$$;

create or replace function public.get_conversation_messages(p_conversation_id bigint, p_limit integer default 50, p_offset integer default 0)
returns table(id bigint, sender_id uuid, content text, message_type text, attachments jsonb, created_at timestamptz, read_at timestamptz)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select 
    m.id,
    m.sender_id,
    m.content,
    m.message_type,
    m.attachments,
    m.created_at,
    m.read_at
  from public.messages m
  where m.conversation_id = p_conversation_id
    and exists (
      select 1
      from public.conversation_participants cp
      where cp.conversation_id = m.conversation_id
        and cp.user_id = auth.uid()
    )
  order by m.created_at desc
  limit p_limit
  offset p_offset;
$$;

create or replace function public.get_matches_with_last_message(p_user_id uuid)
returns table(match_id bigint, other_user_id uuid, other_user_name text, other_user_avatar text, last_message_content text, last_message_at timestamptz, unread_count bigint)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select * from (
    with user_matches as (
      select m.id as match_id,
             case when m.user_a = p_user_id then m.user_b else m.user_a end as other_user_id,
             m.last_interaction_at
      from public.matches m
      where (m.user_a = p_user_id or m.user_b = p_user_id)
        and m.status = 'active'
    )
    select 
      um.match_id,
      um.other_user_id,
      p.display_name as other_user_name,
      p.avatar_url as other_user_avatar,
      last_msg.content as last_message_content,
      c.last_message_at,
      (
        select count(*)
        from public.messages m
        where m.conversation_id = c.id
          and m.sender_id <> p_user_id
          and m.read_at is null
      ) as unread_count
    from user_matches um
    join public.profiles p on p.id = um.other_user_id
    left join public.conversations c on c.match_id = um.match_id
    left join lateral (
      select content
      from public.messages
      where conversation_id = c.id
      order by created_at desc
      limit 1
    ) last_msg on true
    order by c.last_message_at desc nulls last
  ) t
  where auth.uid() = p_user_id;
$$;

create or replace function public.get_profile_compatibility(p_viewer_id uuid, p_target_id uuid)
returns table(red_flag numeric, banter numeric, ghost numeric, shared_interests integer, total_interests integer, message_count integer, last_message_at timestamptz)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select * from (
    with viewer_interests as (
      select interest_id
      from public.profile_interests
      where profile_id = p_viewer_id
    ), target_interests as (
      select interest_id
      from public.profile_interests
      where profile_id = p_target_id
    ), shared as (
      select count(*)::integer as shared_count
      from viewer_interests vi
      join target_interests ti using (interest_id)
    ), interest_totals as (
      select
        coalesce((select shared_count from shared), 0) as shared_count,
        (select count(*) from target_interests)::integer as target_count
    ), convo as (
      select c.id, c.last_message_at
      from public.conversations c
      join public.matches m on m.id = c.match_id
      where (m.user_a = p_viewer_id and m.user_b = p_target_id)
         or (m.user_a = p_target_id and m.user_b = p_viewer_id)
      limit 1
    ), msg_stats as (
      select 
        coalesce((select shared_count from interest_totals), 0) as shared_count,
        coalesce((select target_count from interest_totals), 0) as target_count,
        coalesce((select id from convo), 0) as conversation_id,
        (select last_message_at from convo) as last_message_at,
        (
          select count(*)
          from public.messages m
          where m.conversation_id = (select id from convo)
        )::integer as message_count
    )
    select
      greatest(0, least(1, 1 - ((case when target_count > 0 then shared_count::numeric / target_count else 0 end) * 0.5 + least(1, message_count / 20.0) * 0.3 +
        (case when last_message_at is null then 0 else greatest(0, 1 - (extract(epoch from (now() - last_message_at)) / (86400 * 30))) end) * 0.2))) as red_flag,
      least(1, (case when target_count > 0 then shared_count::numeric / greatest(target_count, 1) else 0 end) * 0.5
        + least(1, message_count / 15.0) * 0.4
        + (case when last_message_at is null then 0 else greatest(0, 1 - (extract(epoch from (now() - last_message_at)) / (86400 * 21))) end) * 0.1) as banter,
      greatest(0, least(1, 1 - (least(1, message_count / 12.0) * 0.5 +
        (case when last_message_at is null then 0 else greatest(0, 1 - (extract(epoch from (now() - last_message_at)) / (86400 * 14))) end) * 0.5))) as ghost,
      shared_count,
      target_count,
      message_count,
      last_message_at
    from msg_stats
  ) metrics
  where auth.uid() = p_viewer_id;
$$;

commit;
