// Try to create storage buckets using Supabase SDK
// This requires a service role key or we'll fall back to Playwright automation

const { createClient } = require('@supabase/supabase-js');

async function createBucketsWithAPI() {
  const projectUrl = 'https://kbfvrmfcrimnomyaqzwd.supabase.co';
  
  // We'll need the service role key for this - check if it's in env or prompt user
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    console.log('Service role key not found. Attempting Playwright automation...');
    return false;
  }

  try {
    const supabase = createClient(projectUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Create avatars bucket (public)
    console.log('Creating avatars bucket...');
    const { data: avatarsData, error: avatarsError } = await supabase.storage.createBucket('avatars', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
    });

    if (avatarsError) {
      if (avatarsError.message.includes('already exists')) {
        console.log('✓ Avatars bucket already exists');
      } else {
        console.error('Error creating avatars bucket:', avatarsError);
        return false;
      }
    } else {
      console.log('✓ Avatars bucket created successfully');
    }

    // Create gallery bucket (private)
    console.log('Creating gallery bucket...');
    const { data: galleryData, error: galleryError } = await supabase.storage.createBucket('gallery', {
      public: false,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
    });

    if (galleryError) {
      if (galleryError.message.includes('already exists')) {
        console.log('✓ Gallery bucket already exists');
      } else {
        console.error('Error creating gallery bucket:', galleryError);
        return false;
      }
    } else {
      console.log('✓ Gallery bucket created successfully');
    }

    console.log('\n✅ All storage buckets created successfully!');
    return true;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

// Export for use in other scripts
if (require.main === module) {
  createBucketsWithAPI().then(success => {
    if (!success) {
      console.log('\n📝 Manual setup instructions:');
      console.log('1. Go to: https://supabase.com/dashboard/project/kbfvrmfcrimnomyaqzwd/storage/buckets');
      console.log('2. Click "New Bucket"');
      console.log('3. Create "avatars" bucket (Public: ON, File size limit: 5MB)');
      console.log('4. Create "gallery" bucket (Public: OFF, File size limit: 10MB)');
      process.exit(1);
    }
  });
}

module.exports = { createBucketsWithAPI };

