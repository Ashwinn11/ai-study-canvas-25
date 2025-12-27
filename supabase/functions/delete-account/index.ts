import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's JWT to verify authentication
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify the user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log(`[delete-account] Processing deletion request for user: ${userId}`);

    // Create admin client with service role key for privileged operations
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Step 1: Check for Storage objects owned by this user
    // According to Supabase docs: "You cannot delete a user if they are the owner of any objects in Supabase Storage"
    console.log(`[delete-account] Checking for Storage objects for user: ${userId}`);

    try {
      // List all buckets and check for user-owned objects
      const { data: buckets, error: bucketsError } = await adminClient.storage.listBuckets();

      if (bucketsError) {
        console.error('[delete-account] Error listing buckets:', bucketsError);
      } else if (buckets && buckets.length > 0) {
        // Check each bucket for user's files
        for (const bucket of buckets) {
          const { data: files, error: filesError } = await adminClient.storage
            .from(bucket.name)
            .list(userId); // Assuming files are organized by user ID

          if (!filesError && files && files.length > 0) {
            console.log(`[delete-account] Found ${files.length} files in bucket ${bucket.name} for user ${userId}`);

            // Delete all user's files in this bucket
            const filePaths = files.map(file => `${userId}/${file.name}`);
            const { error: deleteFilesError } = await adminClient.storage
              .from(bucket.name)
              .remove(filePaths);

            if (deleteFilesError) {
              console.error(`[delete-account] Error deleting files from ${bucket.name}:`, deleteFilesError);
              // Continue anyway - we'll try to delete the user
            } else {
              console.log(`[delete-account] Deleted ${filePaths.length} files from ${bucket.name}`);
            }
          }
        }
      }
    } catch (storageError) {
      console.error('[delete-account] Error handling Storage cleanup:', storageError);
      // Continue anyway - Storage might not be used or error might be benign
    }

    // Step 2: Delete the auth user
    // This will CASCADE delete related records due to foreign key constraints:
    // - profiles (ON DELETE CASCADE)
    // - seeds (ON DELETE CASCADE via user_id FK)
    // - flashcards (CASCADE via seed FK)
    // - exams (CASCADE via user_id FK)
    // - notification preferences (CASCADE)
    // - etc.
    console.log(`[delete-account] Deleting auth user: ${userId}`);

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('[delete-account] Error deleting user:', deleteError);
      return new Response(
        JSON.stringify({
          error: 'Failed to delete account',
          details: deleteError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[delete-account] Successfully deleted user: ${userId}`);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account deleted successfully',
        userId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[delete-account] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
