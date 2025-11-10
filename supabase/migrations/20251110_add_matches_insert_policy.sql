begin;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'matches'
      and policyname = 'matches_insert_participants'
  ) then
    execute 'create policy matches_insert_participants on public.matches for insert to authenticated with check ((auth.uid() = user_a) or (auth.uid() = user_b))';
  end if;
end;
$$;

commit;

