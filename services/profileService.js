import supabase from '../config/supabase';
import { logger } from '../utils/logger';

const mapCompatibilityMetrics = (row) => {
  if (!row) return null;

  const toNumber = (value, fallback = 0) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? fallback : parsed;
    }
    return fallback;
  };

  const messageCount = row.message_count ?? 0;
  const recentMessageCount = row.recent_message_count ?? 0;
  const lastMessageAt = row.last_message_at ?? null;
  const hasHistory = messageCount > 0 || recentMessageCount > 0 || lastMessageAt !== null;

  const activityValue = toNumber(row.activity, toNumber(row.red_flag, 0));
  const banterValue = toNumber(row.banter, 0);
  const ghostValue = toNumber(row.ghost, 0);

  return {
    activity: hasHistory ? activityValue : null,
    banter: hasHistory ? banterValue : null,
    ghost: hasHistory ? ghostValue : null,
    interest_count: row.shared_interests ?? 0,
    interest_capacity: row.total_interests ?? 6,
    message_count: messageCount,
    recent_message_count: recentMessageCount,
    avg_response_seconds: toNumber(row.avg_response_seconds, 86400),
    last_message_at: lastMessageAt,
  };
};

export const profileService = {
  // Get current user's profile
  async getMyProfile() {
    let userId = null;
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('Not authenticated');
      userId = user.id;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return { profile: data, error: null };
    } catch (error) {
      logger.error('Get profile error', {
        error: error?.message || String(error),
        code: error?.code,
        hint: error?.hint,
        userId,
        originalError:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack?.split('\n').slice(0, 10).join('\n'),
              }
            : error,
      });
      return { profile: null, error };
    }
  },

  // Update profile
  async updateProfile(updates) {
    let userId = null;
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('Not authenticated');
      userId = user.id;

      const payload = { ...(updates || {}) };

      const executeUpdate = async (body) =>
        supabase.from('profiles').update(body).eq('id', userId).select().single();

      let { data, error } = await executeUpdate(payload);

      if (error && error?.code === 'PGRST204' && /notification_settings/i.test(error?.message || '')) {
        logger.warn?.('Profile update retry without notification_settings', {
          userId,
          code: error.code,
          message: error.message,
        });
        const fallbackPayload = { ...payload };
        delete fallbackPayload.notification_settings;
        ({ data, error } = await executeUpdate(fallbackPayload));
      }

      if (error) throw error;
      logger.info('Profile updated', { userId });
      return { profile: data, error: null };
    } catch (error) {
      logger.error('Update profile error', {
        error: error?.message || String(error),
        code: error?.code,
        hint: error?.hint,
        userId,
        updates,
        originalError:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack?.split('\n').slice(0, 10).join('\n'),
              }
            : error,
      });
      return { profile: null, error };
    }
  },

  // Get profile by ID
  async getProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return { profile: data, error: null };
    } catch (error) {
      logger.error('Get profile by ID error', {
        error: error?.message || String(error),
        code: error?.code,
        hint: error?.hint,
        userId,
        originalError:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack?.split('\n').slice(0, 10).join('\n'),
              }
            : error,
      });
      return { profile: null, error };
    }
  },

  // Get recommendations
  async getRecommendations(limit = 25) {
    let userId = null;
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('Not authenticated');
      userId = user.id;

      // Try to use RPC function, fallback to basic query if it doesn't exist
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_recommendations', {
        p_user_id: userId,
        p_limit: limit,
      });

      let profileIds = [];
      if (!rpcError && rpcData && rpcData.length > 0) {
        profileIds = rpcData.map((r) => r.profile_id || r.id || r);
      } else {
        // Fallback: Get all profiles except current user
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('id')
          .neq('id', userId)
          .limit(limit);

        profileIds = (allProfiles || []).map((p) => p.id);
      }

      if (profileIds.length === 0) {
        return { profiles: [], error: null };
      }

      const uniqueIds = Array.from(new Set(profileIds));

      const { data: baseProfiles, error: baseError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', uniqueIds);

      if (baseError) throw baseError;

      const profilesWithInterests = await Promise.all(
        (baseProfiles || []).map(async (profile) => {
          const { data: interests } = await supabase
            .from('profile_interests')
            .select('interests:interest_id(slug, label)')
            .eq('profile_id', profile.id);

          return {
            ...profile,
            tags: (interests || []).map((i) => i.interests?.slug || i.slug).filter(Boolean) || [],
          };
        })
      );

      const sanitized = (profilesWithInterests || [])
        .filter((profile) => {
          if (!profile || !profile.id) return false;
          if (profile.id === userId) return false;

          const onboardingComplete =
            !profile.onboarding_state ||
            profile.onboarding_state === 'complete' ||
            profile.onboarding_state === 'completed' ||
            profile.onboarding_state === 'ready';

          const name =
            (typeof profile.display_name === 'string' && profile.display_name.trim()) ||
            (typeof profile.first_name === 'string' && profile.first_name.trim()) ||
            (typeof profile.full_name === 'string' && profile.full_name.trim()) ||
            (typeof profile.name === 'string' && profile.name.trim());

          return onboardingComplete && Boolean(name);
        })
        .map((profile) => ({
          ...profile,
          display_name: typeof profile.display_name === 'string' ? profile.display_name.trim() : profile.display_name,
          first_name: typeof profile.first_name === 'string' ? profile.first_name.trim() : profile.first_name,
        }));

      const deduped = Array.from(new Map(sanitized.map((profile) => [profile.id, profile])).values());

      return { profiles: deduped, error: null };
    } catch (error) {
      logger.error('Get recommendations error', {
        error: error?.message || String(error),
        code: error?.code,
        hint: error?.hint,
        details: error?.details,
        userId,
        originalError:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack?.split('\n').slice(0, 10).join('\n'),
              }
            : error,
      });
      return { profiles: [], error };
    }
  },

  // Get all interests
  async getInterests() {
    try {
      const { data, error } = await supabase
        .from('interests')
        .select('*')
        .order('label');

      if (error) throw error;
      return { interests: data || [], error: null };
    } catch (error) {
      logger.error('Get interests error', {
        error: error?.message || String(error),
        code: error?.code,
        hint: error?.hint,
        originalError:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack?.split('\n').slice(0, 10).join('\n'),
              }
            : error,
      });
      return { interests: [], error };
    }
  },

  // Update user interests
  async updateInterests(interestSlugs) {
    let userId = null;
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('Not authenticated');
      userId = user.id;

      // Get interest IDs from slugs
      const { data: interests, error: interestsError } = await supabase
        .from('interests')
        .select('id')
        .in('slug', interestSlugs);

      if (interestsError) throw interestsError;

      // Delete existing interests
      await supabase
        .from('profile_interests')
        .delete()
        .eq('profile_id', userId);

      // Insert new interests
      if (interests && interests.length > 0) {
        const profileInterests = interests.map((interest) => ({
          profile_id: userId,
          interest_id: interest.id,
        }));

        const { error: insertError } = await supabase.from('profile_interests').insert(profileInterests);

        if (insertError) throw insertError;
      }

      const normalizedSlugs = (interestSlugs || []).map((slug) => (slug ? slug.trim().toLowerCase() : slug)).filter(Boolean);

      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ tags: normalizedSlugs })
        .eq('id', userId);

      if (profileUpdateError) throw profileUpdateError;

      logger.info('Interests updated', { userId, count: normalizedSlugs.length });
      return { error: null };
    } catch (error) {
      logger.error('Update interests error', {
        error: error?.message || String(error),
        code: error?.code,
        hint: error?.hint,
        userId,
        interestCount: interestSlugs.length,
        originalError:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack?.split('\n').slice(0, 10).join('\n'),
              }
            : error,
      });
      return { error };
    }
  },

  // Upload profile image to storage
  async uploadProfileImage(imageUri, isAvatar = true) {
    let userId = null;
    let bucket = 'avatars';
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('Not authenticated');
      userId = user.id;

      bucket = isAvatar ? 'avatars' : 'gallery';
      const fileExt = imageUri.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      // Convert image to byte array (blob is not available on native Hermes)
      const response = await fetch(imageUri);
      const arrayBuffer = await response.arrayBuffer();
      const fileBytes = new Uint8Array(arrayBuffer);
      const contentType =
        response.headers.get('Content-Type') ||
        `image/${fileExt?.toLowerCase() === 'jpg' ? 'jpeg' : fileExt || 'jpeg'}`;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, fileBytes, {
          contentType,
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);

      logger.info('Image uploaded', { bucket, fileName, userId });
      return { url: urlData.publicUrl, path: data.path, error: null };
    } catch (error) {
      logger.error('Upload image error', {
        error: error?.message || String(error),
        code: error?.code,
        bucket,
        userId,
        imageUri,
        isAvatar,
        originalError:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack?.split('\n').slice(0, 10).join('\n'),
              }
            : error,
      });
      return { url: null, path: null, error };
    }
  },

  // Update preferences
  async updatePreferences(preferences) {
    let userId = null;
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('Not authenticated');
      userId = user.id;

      const { data, error } = await supabase
        .from('preferences')
        .upsert({
          profile_id: userId,
          ...preferences,
        })
        .select()
        .single();

      if (error) throw error;
      return { preferences: data, error: null };
    } catch (error) {
      logger.error('Update preferences error', {
        error: error?.message || String(error),
        code: error?.code,
        hint: error?.hint,
        userId,
        preferences,
        originalError:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack?.split('\n').slice(0, 10).join('\n'),
              }
            : error,
      });
      return { preferences: null, error };
    }
  },

  async getProfileWithCompatibility(targetId) {
    let viewerId = null;
    try {
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      viewerId = authData?.user?.id ?? null;

      const [profileResult, compatibilityResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', targetId)
          .single(),
        viewerId
          ? supabase.rpc('get_profile_compatibility', {
              p_viewer_id: viewerId,
              p_target_id: targetId,
            })
          : Promise.resolve({ data: null, error: null }),
      ]);

      const { data: profile, error: profileError } = profileResult;
      if (profileError) throw profileError;

      const { data: compatibilityData, error: compatibilityError } = compatibilityResult;
      if (compatibilityError) throw compatibilityError;

      const compatibilityRow = Array.isArray(compatibilityData) ? compatibilityData[0] : null;
      const compatibility = mapCompatibilityMetrics(compatibilityRow);

      const mergedProfile = profile
        ? {
            ...profile,
            compatibility_metrics: compatibility,
          }
        : profile;

      return { profile: mergedProfile, compatibility, error: null };
    } catch (error) {
      logger.error('Get profile with compatibility error', {
        error: error?.message || String(error),
        code: error?.code,
        hint: error?.hint,
        viewerId,
        targetId,
        originalError:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack?.split('\n').slice(0, 10).join('\n'),
              }
            : error,
      });
      return { profile: null, compatibility: null, error };
    }
  },
};

