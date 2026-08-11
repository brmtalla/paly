import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabase.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;

    // Purge the stored files first. Deleting the `uploads` rows below loses the
    // paths, so doing this afterwards would strand the student's lecture slides
    // in the bucket — which the privacy policy says we delete.
    const { data: userUploads } = await supabaseAdmin
      .from('uploads')
      .select('file_path')
      .eq('user_id', userId);

    const filePaths = (userUploads ?? [])
      .map((u: { file_path: string | null }) => u.file_path)
      .filter((p): p is string => !!p);

    if (filePaths.length > 0) {
      const { error: storageError } = await supabaseAdmin.storage.from('uploads').remove(filePaths);

      // Not fatal: an orphaned object is better than an account we refuse to
      // delete, and Apple requires the deletion itself to succeed.
      if (storageError) {
        console.error('Storage cleanup failed during account deletion:', storageError);
      }
    }

    // Delete user data in order (respecting foreign keys)
    const tables = [
      'push_tokens',
      'notification_preferences',
      'quiz_attempts',
      'study_prompts',
      'synthesized_content',
      'uploads',
      'notes',
      'class_sessions',
      'classes',
      'availability_blocks',
      'profiles',
    ];

    for (const table of tables) {
      const column = table === 'class_sessions' ? 'class_id' : 'user_id';
      if (table === 'class_sessions') {
        const { data: userClasses } = await supabaseAdmin
          .from('classes')
          .select('id')
          .eq('user_id', userId);
        if (userClasses && userClasses.length > 0) {
          await supabaseAdmin
            .from('class_sessions')
            .delete()
            .in('class_id', userClasses.map((c) => c.id));
        }
      } else {
        await supabaseAdmin.from(table).delete().eq(column, userId);
      }
    }

    // Delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('Error deleting auth user:', deleteError);
      return new Response(JSON.stringify({ error: 'Failed to delete auth user' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Delete account error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
