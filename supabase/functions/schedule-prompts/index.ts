import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { requireUserId, unauthorizedResponse } from '../_shared/auth.ts';
import { supabaseAdmin } from '../_shared/supabase.ts';
import { sendSmsToProfile } from '../_shared/sms.ts';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let userId: string;
  try {
    userId = await requireUserId(req);
  } catch (error) {
    return unauthorizedResponse(error);
  }

  try {
    const { classId, className, synthesizedContentId, dailyChunks, startDate } = await req.json();

    if (!classId || !synthesizedContentId || !dailyChunks) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // The synthesized content (and therefore the class) must belong to the caller.
    const { data: ownedContent } = await supabaseAdmin
      .from('synthesized_content')
      .select('id')
      .eq('id', synthesizedContentId)
      .eq('class_id', classId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!ownedContent) {
      return new Response(JSON.stringify({ error: 'Synthesized content not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's availability blocks
    const { data: availabilityBlocks } = await supabaseAdmin
      .from('availability_blocks')
      .select('*')
      .eq('user_id', userId)
      .eq('is_recurring', true);

    // Get user's notification preferences
    const { data: notifPrefs } = await supabaseAdmin
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Default times if no availability set (10 AM, 2 PM, 6 PM)
    const defaultTimes = ['10:00', '14:00', '18:00'];

    // Create prompts for each day
    const prompts = [];
    const baseDate = startDate ? new Date(startDate) : new Date();

    for (const chunk of dailyChunks) {
      const dayOffset = chunk.day - 1;
      const promptDate = new Date(baseDate);
      promptDate.setDate(promptDate.getDate() + dayOffset);

      const dayOfWeek = promptDate.getDay();

      // Find available time for this day
      let scheduledTime = defaultTimes[dayOffset % defaultTimes.length];

      if (availabilityBlocks && availabilityBlocks.length > 0) {
        const dayBlock = availabilityBlocks.find((b) => b.day_of_week === dayOfWeek);
        if (dayBlock) {
          // Schedule in the middle of availability block
          const startParts = dayBlock.start_time.split(':');
          const endParts = dayBlock.end_time.split(':');
          const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
          const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
          const middleMinutes = Math.floor((startMinutes + endMinutes) / 2);
          const hours = Math.floor(middleMinutes / 60);
          const minutes = middleMinutes % 60;
          scheduledTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
      }

      // Set the time on the date
      const [hours, minutes] = scheduledTime.split(':');
      promptDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Determine prompt type based on day
      let promptType = 'takeaway';
      if (chunk.day === 2 || chunk.day === 3) {
        promptType = 'recall';
      } else if (chunk.day >= 4) {
        promptType = Math.random() > 0.5 ? 'flashcard' : 'quiz';
      }

      prompts.push({
        user_id: userId,
        class_id: classId,
        synthesized_content_id: synthesizedContentId,
        prompt_type: promptType,
        content: chunk.content,
        scheduled_for: promptDate.toISOString(),
        day_index: chunk.day,
        delivery_method: notifPrefs?.push_enabled ? 'push' : 'both',
      });
    }

    // Insert all prompts
    const { data: insertedPrompts, error } = await supabaseAdmin
      .from('study_prompts')
      .insert(prompts)
      .select();

    if (error) {
      console.error('Error inserting prompts:', error);
      return new Response(JSON.stringify({ error: 'Failed to schedule prompts' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Immediately deliver any prompts scheduled for right now or in the past
    const now = new Date();
    const immediatePrompts = insertedPrompts.filter((p: any) => new Date(p.scheduled_for) <= now);

    let smsDelivered = 0;
    if (immediatePrompts.length > 0) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('phone_number, sms_opted_in, assistant_name')
        .eq('id', userId)
        .single();

      if (profile?.phone_number) {
        const assistantName = profile.assistant_name || 'Paly';

        for (const prompt of immediatePrompts) {
          const typeLabels: Record<string, string> = {
            takeaway: 'Key Takeaway',
            recall: 'Quick Recall',
            quiz: 'Quiz Time',
            flashcard: 'Flashcard',
          };
          const typeLabel = typeLabels[prompt.prompt_type] || 'Study Nugget';
          const smsBody = `${assistantName} here! 📚\n\n[${typeLabel} - Day ${prompt.day_index}]\n${className}\n\n${prompt.content}`;

          const result = await sendSmsToProfile(profile, smsBody);
          if (result.success) {
            await supabaseAdmin
              .from('study_prompts')
              .update({ delivered_at: new Date().toISOString() })
              .eq('id', prompt.id);
            smsDelivered++;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        promptsScheduled: insertedPrompts.length,
        smsDelivered,
        prompts: insertedPrompts,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Schedule prompts error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
