begin;

-- Comprehensive recommendation algorithm implementing all 4 phases
-- Phase 1: Match Probability
-- Phase 2: Engagement Boost  
-- Phase 3: Variety/Novelty
-- Phase 4: Social Proof

create or replace function public.get_recommendations(
  p_user_id uuid,
  p_limit integer default 25
)
returns table(
  profile_id uuid,
  match_score numeric,
  match_probability numeric,
  engagement_boost numeric,
  novelty_score numeric,
  popularity_score numeric
)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user_profile public.profiles%rowtype;
  v_user_prefs public.preferences%rowtype;
  v_user_interests integer[];
  v_user_age integer;
  v_user_gender text;
  v_user_location_lat double precision;
  v_user_location_lng double precision;
  v_user_show_me text[];
begin
  -- Get user profile and preferences
  select * into v_user_profile
  from public.profiles
  where id = p_user_id;
  
  if v_user_profile is null then
    return;
  end if;
  
  -- Get user preferences
  select * into v_user_prefs
  from public.preferences
  where preferences.profile_id = p_user_id;
  
  -- Get user interests
  select array_agg(interest_id) into v_user_interests
  from public.profile_interests
  where profile_interests.profile_id = p_user_id;
  
  v_user_age := v_user_profile.age;
  v_user_gender := v_user_profile.gender;
  v_user_location_lat := v_user_profile.location_lat;
  v_user_location_lng := v_user_profile.location_lng;
  v_user_show_me := coalesce(v_user_prefs.show_me, array['any']);
  
  -- Calculate engagement metrics for user (Phase 2)
  -- Daily login streak (consecutive days with sessions)
  -- Swipe activity (swipes in last 7 days)
  -- Match rate (matches / swipes sent)
  
  return query
  with 
  -- Exclude already swiped profiles
  excluded_profiles as (
    select distinct target_id
    from public.swipes
    where swiper_id = p_user_id
  ),
  
  -- Exclude blocked users
  blocked_profiles as (
    select blocked_id
    from public.blocks
    where blocker_id = p_user_id
    union
    select blocker_id
    from public.blocks
    where blocked_id = p_user_id
  ),
  
  -- Exclude existing matches
  matched_profiles as (
    select case 
      when user_a = p_user_id then user_b
      else user_a
    end as matched_id
    from public.matches
    where (user_a = p_user_id or user_b = p_user_id)
      and status = 'active'
  ),
  
  -- Candidate profiles
  candidates as (
    select p.*
    from public.profiles p
    where p.id != p_user_id
      and p.id not in (select target_id from excluded_profiles)
      and p.id not in (select blocked_id from blocked_profiles)
      and p.id not in (select matched_id from matched_profiles)
      and p.onboarding_state = 'complete'
      and (
        -- Gender filter
        'any' = any(v_user_show_me)
        or p.gender = any(v_user_show_me)
      )
      and (
        -- Age filter
        v_user_prefs is null
        or (
          p.age >= coalesce(v_user_prefs.age_min, 18)
          and p.age <= coalesce(v_user_prefs.age_max, 100)
        )
      )
  ),
  
  -- Phase 1: Match Probability Components
  interest_overlap as (
    select 
      c.id as profile_id,
      coalesce(
        (
          select count(*)::numeric / greatest(
            (select count(*) from public.profile_interests where profile_id = p_user_id),
            (select count(*) from public.profile_interests where profile_id = c.id),
            1
          )
          from public.profile_interests vi
          join public.profile_interests ti on ti.interest_id = vi.interest_id
          where vi.profile_id = p_user_id
            and ti.profile_id = c.id
        ),
        0
      ) as overlap_score
    from candidates c
  ),
  
  compatibility_metrics as (
    select 
      c.id as profile_id,
      coalesce(
        (
          select 
            (coalesce(compat.banter, 0.5) * 0.4 + 
             (1 - coalesce(compat.ghost, 0.5)) * 0.4 +
             (1 - coalesce(compat.red_flag, 0.5)) * 0.2)
          from lateral public.get_profile_compatibility(p_user_id, c.id) compat
          limit 1
        ),
        0.5
      ) as compat_score
    from candidates c
  ),
  
  age_compatibility as (
    select 
      c.id as profile_id,
      case
        when v_user_prefs is null then 1.0
        when c.age >= coalesce(v_user_prefs.age_min, 18) 
          and c.age <= coalesce(v_user_prefs.age_max, 100) then 1.0
        else 0.3
      end as age_score
    from candidates c
  ),
  
  location_proximity as (
    select 
      c.id as profile_id,
      case
        when v_user_location_lat is null or v_user_location_lng is null 
          or c.location_lat is null or c.location_lng is null then 0.5
        when v_user_prefs is null then 0.5
        else
          greatest(0, 1.0 - (
            -- Haversine distance in km (simplified)
            (6371 * acos(
              least(1.0, 
                cos(radians(v_user_location_lat)) * 
                cos(radians(c.location_lat)) * 
                cos(radians(c.location_lng) - radians(v_user_location_lng)) + 
                sin(radians(v_user_location_lat)) * 
                sin(radians(c.location_lat))
              )
            )) / coalesce(v_user_prefs.distance_km, 100)
          ))
      end as location_score
    from candidates c
  ),
  
  activity_recency as (
    select 
      c.id as profile_id,
      case
        when c.last_active is null then 0.1
        when c.last_active > now() - interval '1 day' then 1.0
        when c.last_active > now() - interval '3 days' then 0.8
        when c.last_active > now() - interval '7 days' then 0.6
        when c.last_active > now() - interval '14 days' then 0.4
        else 0.2
      end as activity_score
    from candidates c
  ),
  
  profile_quality as (
    select 
      c.id as profile_id,
      (
        (case when c.avatar_url is not null then 0.3 else 0 end) +
        (case when array_length(c.gallery_urls, 1) > 0 then 0.2 else 0 end) +
        (case when c.bio is not null and length(c.bio) > 20 then 0.2 else 0 end) +
        (case when array_length(c.tags, 1) > 0 then 0.15 else 0 end) +
        (case when c.location is not null then 0.15 else 0 end)
      ) as quality_score
    from candidates c
  ),
  
  -- Phase 1: Match Probability (combined)
  match_probability_scores as (
    select 
      c.id as profile_id,
      (
        coalesce(io.overlap_score, 0) * 0.30 +
        coalesce(cm.compat_score, 0.5) * 0.25 +
        coalesce(ac.age_score, 0.5) * 0.15 +
        coalesce(lp.location_score, 0.5) * 0.10 +
        coalesce(ar.activity_score, 0.5) * 0.10 +
        coalesce(pq.quality_score, 0.5) * 0.10
      ) as match_probability
    from candidates c
    left join interest_overlap io on io.profile_id = c.id
    left join compatibility_metrics cm on cm.profile_id = c.id
    left join age_compatibility ac on ac.profile_id = c.id
    left join location_proximity lp on lp.profile_id = c.id
    left join activity_recency ar on ar.profile_id = c.id
    left join profile_quality pq on pq.profile_id = c.id
  ),
  
  -- Phase 2: Engagement Boost
  user_engagement as (
    select 
      -- Daily login streak (consecutive days with sessions)
      (
        select count(distinct date(started_at))
        from public.sessions
        where user_id = p_user_id
          and started_at > now() - interval '7 days'
      )::numeric / 7.0 as login_streak,
      
      -- Swipe activity (swipes in last 7 days)
      (
        select count(*)::numeric
        from public.swipes
        where swiper_id = p_user_id
          and created_at > now() - interval '7 days'
      ) / 50.0 as swipe_activity,
      
      -- Match rate (matches / swipes sent)
      case
        when (
          select count(*) from public.swipes
          where swiper_id = p_user_id
            and direction = 'like'
        ) > 0 then
          (
            select count(*)::numeric
            from public.matches m
            where (m.user_a = p_user_id or m.user_b = p_user_id)
              and m.status = 'active'
          ) / (
            select count(*)::numeric
            from public.swipes
            where swiper_id = p_user_id
              and direction = 'like'
          )
        else 0.1
      end as match_rate
  ),
  
  engagement_multiplier as (
    select 
      c.id as profile_id,
      (
        1.0 + 
        (least(ue.login_streak, 1.0) * 0.1) +
        (least(ue.swipe_activity, 1.0) * 0.05) +
        (least(ue.match_rate, 1.0) * 0.15)
      ) as engagement_boost
    from candidates c
    cross join user_engagement ue
  ),
  
  -- Phase 3: Variety/Novelty
  recent_swipes_interests as (
    select distinct pi.interest_id
    from public.swipes s
    join public.profile_interests pi on pi.profile_id = s.target_id
    where s.swiper_id = p_user_id
      and s.created_at > now() - interval '24 hours'
  ),
  
  novelty_scores as (
    select 
      c.id as profile_id,
      (
        -- Interest diversity (different from recent swipes)
        case
          when not exists (select 1 from recent_swipes_interests rsi
                          join public.profile_interests pi on pi.interest_id = rsi.interest_id
                          where pi.profile_id = c.id) then 1.0
          else 0.5
        end * 0.5 +
        
        -- New user boost (created in last 7 days)
        case
          when c.created_at > now() - interval '7 days' then 1.0
          when c.created_at > now() - interval '14 days' then 0.7
          when c.created_at > now() - interval '30 days' then 0.4
          else 0.1
        end * 0.3 +
        
        -- Rotation factor (haven't seen similar profiles recently)
        case
          when not exists (
            select 1 from public.swipes s
            where s.swiper_id = p_user_id
              and s.target_id in (
                select p2.id from public.profiles p2
                where p2.gender = c.gender
                  and abs(p2.age - c.age) <= 3
              )
              and s.created_at > now() - interval '6 hours'
          ) then 1.0
          else 0.6
        end * 0.2
      ) as novelty_score
    from candidates c
  ),
  
  -- Phase 4: Social Proof (Popularity)
  popularity_scores as (
    select 
      c.id as profile_id,
      (
        -- Like rate (likes received / swipes received)
        case
          when (
            select count(*) from public.swipes
            where target_id = c.id
          ) > 0 then
            (
              select count(*)::numeric
              from public.swipes
              where target_id = c.id
                and direction = 'like'
            ) / (
              select count(*)::numeric
              from public.swipes
              where target_id = c.id
            )
          else 0.5
        end * 0.4 +
        
        -- Super like rate (super likes received)
        case
          when (
            select count(*) from public.swipes
            where target_id = c.id
          ) > 0 then
            (
              select count(*)::numeric
              from public.swipes
              where target_id = c.id
                and direction = 'super'
            ) / (
              select count(*)::numeric
              from public.swipes
              where target_id = c.id
            ) * 2.0
          else 0.0
        end * 0.3 +
        
        -- Match rate (high match rate = desirable)
        case
          when (
            select count(*) from public.swipes
            where target_id = c.id
              and direction = 'like'
          ) > 0 then
            (
              select count(*)::numeric
              from public.matches m
              where (m.user_a = c.id or m.user_b = c.id)
                and m.status = 'active'
            ) / (
              select count(*)::numeric
              from public.swipes
              where target_id = c.id
                and direction = 'like'
            )
          else 0.3
        end * 0.3
      ) as popularity_score
    from candidates c
  ),
  
  -- Final combined scores
  final_scores as (
    select 
      c.id as profile_id,
      mps.match_probability,
      em.engagement_boost,
      ns.novelty_score,
      ps.popularity_score,
      (
        mps.match_probability * 0.40 +
        (mps.match_probability * em.engagement_boost - mps.match_probability) * 0.25 +
        ns.novelty_score * 0.20 +
        ps.popularity_score * 0.15
      ) as match_score
    from candidates c
    join match_probability_scores mps on mps.profile_id = c.id
    join engagement_multiplier em on em.profile_id = c.id
    join novelty_scores ns on ns.profile_id = c.id
    join popularity_scores ps on ps.profile_id = c.id
  )
  
  select 
    fs.profile_id,
    fs.match_score,
    fs.match_probability,
    fs.engagement_boost,
    fs.novelty_score,
    fs.popularity_score
  from final_scores fs
  order by fs.match_score desc
  limit p_limit;
end;
$$;

-- Grant execute permission
grant execute on function public.get_recommendations(uuid, integer) to authenticated;

comment on function public.get_recommendations(uuid, integer) is 
'Comprehensive recommendation algorithm with 4 phases: Match Probability, Engagement Boost, Variety/Novelty, and Social Proof';

commit;

