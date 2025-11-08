import supabase from '../config/supabase';
import { logger } from '../utils/logger';

export const profileService = {
  // Get current user's profile
  async getMyProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return { profile: data, error: null };
    } catch (error) {
      logger.error('Get profile error', { 
        error: error.message,
        code: error.code,
        hint: error.hint,
        userId: user?.id,
        originalError: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 10).join('\n'),
        } : error,
      });
      return { profile: null, error };
    }
  },

  // Update profile
  async updateProfile(updates) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      logger.info('Profile updated', { userId: user.id });
      return { profile: data, error: null };
    } catch (error) {
      logger.error('Update profile error', { 
        error: error.message,
        code: error.code,
        hint: error.hint,
        userId: user?.id,
        updates,
        originalError: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 10).join('\n'),
        } : error,
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
        error: error.message,
        code: error.code,
        hint: error.hint,
        userId,
        originalError: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 10).join('\n'),
        } : error,
      });
      return { profile: null, error };
    }
  },

  // Get recommendations
  async getRecommendations(limit = 25) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Try to use RPC function, fallback to basic query if it doesn't exist
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_recommendations', {
        p_user_id: user.id,
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
          .neq('id', user.id)
          .limit(limit);

        profileIds = (allProfiles || []).map((p) => p.id);
      }

      if (profileIds.length === 0) {
        return { profiles: [], error: null };
      }

      // Fetch full profile data
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', profileIds);

      if (profilesError) throw profilesError;

      // Get interests for each profile
      const profilesWithInterests = await Promise.all(
        (profiles || []).map(async (profile) => {
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

      return { profiles: profilesWithInterests, error: null };
    } catch (error) {
      logger.error('Get recommendations error', { 
        error: error.message,
        code: error.code,
        hint: error.hint,
        details: error.details,
        originalError: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 10).join('\n'),
        } : error,
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
        error: error.message,
        code: error.code,
        hint: error.hint,
        originalError: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 10).join('\n'),
        } : error,
      });
      return { interests: [], error };
    }
  },

  // Update user interests
  async updateInterests(interestSlugs) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

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
        .eq('profile_id', user.id);

      // Insert new interests
      if (interests && interests.length > 0) {
        const profileInterests = interests.map((interest) => ({
          profile_id: user.id,
          interest_id: interest.id,
        }));

        const { error: insertError } = await supabase
          .from('profile_interests')
          .insert(profileInterests);

        if (insertError) throw insertError;
      }

      logger.info('Interests updated', { userId: user.id, count: interestSlugs.length });
      return { error: null };
    } catch (error) {
      logger.error('Update interests error', { 
        error: error.message,
        code: error.code,
        hint: error.hint,
        userId: user?.id,
        interestCount: interestSlugs.length,
        originalError: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 10).join('\n'),
        } : error,
      });
      return { error };
    }
  },

  // Upload profile image to storage
  async uploadProfileImage(imageUri, isAvatar = true) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const bucket = isAvatar ? 'avatars' : 'gallery';
      const fileExt = imageUri.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Convert image to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, blob, {
          contentType: `image/${fileExt}`,
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      logger.info('Image uploaded', { bucket, fileName });
      return { url: urlData.publicUrl, path: data.path, error: null };
    } catch (error) {
      logger.error('Upload image error', { 
        error: error.message,
        code: error.code,
        bucket,
        userId: user?.id,
        imageUri,
        isAvatar,
        originalError: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 10).join('\n'),
        } : error,
      });
      return { url: null, path: null, error };
    }
  },

  // Update preferences
  async updatePreferences(preferences) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('preferences')
        .upsert({
          profile_id: user.id,
          ...preferences,
        })
        .select()
        .single();

      if (error) throw error;
      return { preferences: data, error: null };
    } catch (error) {
      logger.error('Update preferences error', { 
        error: error.message,
        code: error.code,
        hint: error.hint,
        userId: user?.id,
        preferences,
        originalError: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 10).join('\n'),
        } : error,
      });
      return { preferences: null, error };
    }
  },
};

