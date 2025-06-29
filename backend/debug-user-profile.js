require('dotenv').config();
const { supabase, isSupabaseConfigured } = require('./config/supabase');

async function checkUserProfiles() {
  console.log('Supabase configured:', isSupabaseConfigured);
  
  if (!isSupabaseConfigured || !supabase) {
    console.log('Supabase not configured properly');
    return;
  }
  
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, email, full_name, avatar_url, user_type')
      .limit(10);
    
    if (error) {
      console.error('Error fetching profiles:', error);
    } else {
      console.log('User profiles found:', data?.length || 0);
      data?.forEach((profile, index) => {
        console.log(`Profile ${index + 1}:`, {
          user_id: profile.user_id,
          email: profile.email,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          user_type: profile.user_type
        });
      });
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

checkUserProfiles();