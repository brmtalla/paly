import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

const CLASSES = [
  {
    name: "Law for Technology",
    location: "331 Uris Hall",
    instructor_name: "Professor John Rudikoff",
    sessions: [{ day_of_week: 2, start_time: "16:10:00", end_time: "18:00:00", location: "331 Uris Hall" }],
  },
  {
    name: "Entrepreneurship: Develop/Implement New",
    location: "331 Uris Hall",
    instructor_name: "Professor Michael McGuire",
    sessions: [{ day_of_week: 1, start_time: "16:10:00", end_time: "18:00:00", location: "331 Uris Hall" }],
  },
  {
    name: "Economics of Strategic Behavior",
    location: "820 Kravis Hall",
    instructor_name: "Professor Paola Valenti",
    sessions: [
      { day_of_week: 1, start_time: "14:20:00", end_time: "15:50:00", location: "820 Kravis Hall" },
      { day_of_week: 3, start_time: "14:20:00", end_time: "15:50:00", location: "820 Kravis Hall" },
    ],
  },
  {
    name: "Topics in Technology Career Paths and Industry",
    location: "501 Schermerhorn Hall",
    instructor_name: "Professor Shahryar Shaghaghi",
    description: "Workshop",
    sessions: [{ day_of_week: 3, start_time: "20:10:00", end_time: "21:30:00", location: "501 Schermerhorn Hall" }],
  },
  {
    name: "Digital Transformation",
    location: "420 Pupin Laboratories",
    instructor_name: "Professor Richard R. Ranade",
    sessions: [{ day_of_week: 2, start_time: "18:10:00", end_time: "20:00:00", location: "420 Pupin Laboratories" }],
  },
  {
    name: "AI/ML for Leaders",
    location: "140 Uris Hall",
    instructor_name: "Professor Hsing-Hsing Li",
    sessions: [{ day_of_week: 3, start_time: "18:10:00", end_time: "20:00:00", location: "140 Uris Hall" }],
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the authenticated user from the JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    const createdClasses = [];

    for (const classInfo of CLASSES) {
      // Check if class already exists
      const { data: existing } = await supabaseAdmin
        .from("classes")
        .select("id")
        .eq("user_id", userId)
        .eq("name", classInfo.name)
        .eq("is_active", true)
        .single();

      if (existing) {
        createdClasses.push({ name: classInfo.name, status: "already_exists", id: existing.id });
        continue;
      }

      const { data: newClass, error: classError } = await supabaseAdmin
        .from("classes")
        .insert({
          user_id: userId,
          name: classInfo.name,
          location: classInfo.location,
          instructor_name: classInfo.instructor_name,
          description: classInfo.description || null,
        })
        .select()
        .single();

      if (classError) {
        console.error(`Error creating ${classInfo.name}:`, classError);
        createdClasses.push({ name: classInfo.name, status: "error", error: classError.message });
        continue;
      }

      // Create sessions
      const sessionsWithClassId = classInfo.sessions.map((s) => ({
        ...s,
        class_id: newClass.id,
      }));

      const { error: sessionsError } = await supabaseAdmin
        .from("class_sessions")
        .insert(sessionsWithClassId);

      if (sessionsError) {
        console.error(`Error creating sessions for ${classInfo.name}:`, sessionsError);
      }

      createdClasses.push({ name: classInfo.name, status: "created", id: newClass.id });
    }

    return new Response(
      JSON.stringify({ success: true, classes: createdClasses }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Seed classes error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
