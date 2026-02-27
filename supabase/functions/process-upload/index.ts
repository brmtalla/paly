import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { sendSms } from "../_shared/twilio.ts";
import JSZip from "https://esm.sh/jszip@3.10.1";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { uploadId, filePath, fileType, classId, userId, sessionDate, skipExtraction, extractOnly } = await req.json();

    if (!classId || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 1: Extract text (skip if already done) ───────────────────
    if (!skipExtraction && uploadId && uploadId !== "manual-trigger" && filePath) {
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from("uploads")
        .download(filePath);

      if (downloadError || !fileData) {
        console.error("Download error:", downloadError);
        return new Response(
          JSON.stringify({ error: "Failed to download file" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const buffer = await fileData.arrayBuffer();
      const extension = (fileType || filePath.split(".").pop() || "").toLowerCase();
      let extractedText = "";

      switch (extension) {
        case "pdf":
          extractedText = await extractPdf(buffer);
          break;
        case "docx":
        case "doc":
          extractedText = await extractDocx(buffer);
          break;
        case "pptx":
        case "ppt":
          extractedText = await extractPptx(buffer);
          break;
        case "txt":
        case "md":
          extractedText = new TextDecoder().decode(buffer);
          break;
        default:
          extractedText = new TextDecoder().decode(buffer);
          break;
      }

      extractedText = extractedText.trim();
      if (!extractedText) {
        return new Response(
          JSON.stringify({ error: "No text extracted from file", debug: { extension, bufferSize: buffer.byteLength, header: new TextDecoder("latin1").decode(new Uint8Array(buffer).slice(0, 10)) } }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabaseAdmin
        .from("uploads")
        .update({ extracted_text: extractedText })
        .eq("id", uploadId);

      // If extract-only mode, stop here (user will manually synthesize later)
      if (extractOnly) {
        return new Response(
          JSON.stringify({
            success: true,
            status: "extracted",
            textLength: extractedText.length,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── Step 2: Look up next class date ───────────────────────────────
    const { data: sessions } = await supabaseAdmin
      .from("class_sessions")
      .select("day_of_week, start_time")
      .eq("class_id", classId);

    const { data: classData } = await supabaseAdmin
      .from("classes")
      .select("name")
      .eq("id", classId)
      .single();

    const className = classData?.name || "your class";

    const nextClassDate = computeNextClassDate(sessions || []);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Days between today and the day before next class
    const dayBeforeClass = new Date(nextClassDate);
    dayBeforeClass.setDate(dayBeforeClass.getDate() - 1);

    const msPerDay = 86400000;
    const totalDays = Math.max(1, Math.round((dayBeforeClass.getTime() - today.getTime()) / msPerDay));
    const numStudyDays = Math.max(1, Math.min(totalDays, 14)); // cap at 14

    // ── Step 3: Check for overdue quizzes ─────────────────────────────
    const { data: overdueContent } = await supabaseAdmin
      .from("synthesized_content")
      .select("id, next_class_date")
      .eq("class_id", classId)
      .eq("user_id", userId)
      .not("next_class_date", "is", null)
      .lt("next_class_date", today.toISOString().split("T")[0]);

    let hasOverdueQuiz = false;
    if (overdueContent && overdueContent.length > 0) {
      for (const sc of overdueContent) {
        const { data: attempts } = await supabaseAdmin
          .from("quiz_attempts")
          .select("id")
          .eq("synthesized_content_id", sc.id)
          .not("completed_at", "is", null)
          .limit(1);

        if (!attempts || attempts.length === 0) {
          hasOverdueQuiz = true;
          break;
        }
      }
    }

    if (hasOverdueQuiz) {
      // Send a reminder instead of synthesizing
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("phone_number, assistant_name")
        .eq("id", userId)
        .single();

      if (profile?.phone_number) {
        const name = profile.assistant_name || "Paly";
        await sendSms(
          profile.phone_number,
          `${name} here! 🚨 Your slides for ${className} were uploaded, but you have an overdue quiz. Take it first to unlock new study material!`
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: "blocked_overdue_quiz",
          message: "Synthesis blocked until overdue quiz is completed.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 4: Gather all content for this class/session date ────────
    const { data: allUploads } = await supabaseAdmin
      .from("uploads")
      .select("extracted_text")
      .eq("class_id", classId)
      .eq("user_id", userId)
      .eq("session_date", sessionDate || today.toISOString().split("T")[0])
      .not("extracted_text", "is", null);

    const { data: notes } = await supabaseAdmin
      .from("notes")
      .select("id, content")
      .eq("class_id", classId)
      .eq("user_id", userId)
      .eq("session_date", sessionDate || today.toISOString().split("T")[0]);

    const notesContent = notes?.map((n: any) => n.content).filter(Boolean).join("\n\n") || "";
    const uploadsContent = allUploads?.map((u: any) => u.extracted_text).filter(Boolean).join("\n\n") || "";
    const combinedContent = `${notesContent}\n\n${uploadsContent}`.trim();

    if (combinedContent.length < 50) {
      return new Response(
        JSON.stringify({ error: "Not enough content to synthesize (need 50+ chars)" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 5: AI Synthesis with dynamic chunk count ─────────────────
    const synthesized = await callOpenAI(combinedContent, className, numStudyDays);

    // ── Step 6: Save synthesized content ──────────────────────────────
    const effectiveSessionDate = sessionDate || today.toISOString().split("T")[0];

    const { data: allSessionUploads } = await supabaseAdmin
      .from("uploads")
      .select("id")
      .eq("class_id", classId)
      .eq("user_id", userId)
      .eq("session_date", effectiveSessionDate);

    const { data: savedContent, error: saveError } = await supabaseAdmin
      .from("synthesized_content")
      .insert({
        class_id: classId,
        user_id: userId,
        session_date: effectiveSessionDate,
        summary: synthesized.summary,
        key_takeaways: synthesized.keyTakeaways,
        flashcards: synthesized.flashcards,
        quiz_questions: synthesized.quizQuestions,
        daily_chunks: synthesized.dailyChunks,
        source_note_ids: notes?.map((n: any) => n.id) || [],
        source_upload_ids: allSessionUploads?.map((u: any) => u.id) || [],
        next_class_date: nextClassDate.toISOString().split("T")[0],
        quiz_deadline_notified: 0,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Save error:", saveError);
      return new Response(
        JSON.stringify({ error: "Failed to save synthesized content" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark notes as synthesized
    if (notes && notes.length > 0) {
      await supabaseAdmin
        .from("notes")
        .update({ is_synthesized: true })
        .in("id", notes.map((n: any) => n.id));
    }

    // ── Step 7: Schedule study prompts ────────────────────────────────
    const { data: availabilityBlocks } = await supabaseAdmin
      .from("availability_blocks")
      .select("*")
      .eq("user_id", userId)
      .eq("is_recurring", true);

    const { data: notifPrefs } = await supabaseAdmin
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    const defaultTimes = ["10:00", "14:00", "18:00"];
    const prompts: any[] = [];
    const dailyChunks = synthesized.dailyChunks || [];

    for (const chunk of dailyChunks) {
      const dayOffset = chunk.day - 1;
      const promptDate = new Date(today);
      promptDate.setDate(promptDate.getDate() + dayOffset);

      const dayOfWeek = promptDate.getDay();
      let scheduledTime = defaultTimes[dayOffset % defaultTimes.length];

      if (availabilityBlocks && availabilityBlocks.length > 0) {
        const dayBlock = availabilityBlocks.find((b: any) => b.day_of_week === dayOfWeek);
        if (dayBlock) {
          const startParts = dayBlock.start_time.split(":");
          const endParts = dayBlock.end_time.split(":");
          const startMin = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
          const endMin = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
          const midMin = Math.floor((startMin + endMin) / 2);
          scheduledTime = `${String(Math.floor(midMin / 60)).padStart(2, "0")}:${String(midMin % 60).padStart(2, "0")}`;
        }
      }

      const [h, m] = scheduledTime.split(":");
      promptDate.setHours(parseInt(h), parseInt(m), 0, 0);

      let promptType = "takeaway";
      if (chunk.day <= 2) promptType = "takeaway";
      else if (chunk.day <= Math.ceil(numStudyDays / 2)) promptType = "recall";
      else promptType = "flashcard";

      prompts.push({
        user_id: userId,
        class_id: classId,
        synthesized_content_id: savedContent.id,
        prompt_type: promptType,
        content: chunk.content,
        scheduled_for: promptDate.toISOString(),
        day_index: chunk.day,
        delivery_method: notifPrefs?.sms_enabled ? "sms" : "both",
      });
    }

    // Schedule the mandatory quiz prompt for the day before next class
    const quizDate = new Date(dayBeforeClass);
    const quizDayOfWeek = quizDate.getDay();
    let quizTime = "10:00";
    if (availabilityBlocks && availabilityBlocks.length > 0) {
      const dayBlock = availabilityBlocks.find((b: any) => b.day_of_week === quizDayOfWeek);
      if (dayBlock) {
        quizTime = dayBlock.start_time;
      }
    }
    const [qh, qm] = quizTime.split(":");
    quizDate.setHours(parseInt(qh), parseInt(qm), 0, 0);

    prompts.push({
      user_id: userId,
      class_id: classId,
      synthesized_content_id: savedContent.id,
      prompt_type: "quiz",
      content: `📋 Quiz time for ${className}! You have until tomorrow's class to complete it. Open the app and test your knowledge now. Your streak depends on it!`,
      scheduled_for: quizDate.toISOString(),
      day_index: numStudyDays + 1,
      delivery_method: notifPrefs?.sms_enabled ? "sms" : "both",
    });

    const { data: insertedPrompts, error: promptError } = await supabaseAdmin
      .from("study_prompts")
      .insert(prompts)
      .select();

    if (promptError) {
      console.error("Prompt scheduling error:", promptError);
    }

    // Immediately deliver any prompts that are already due
    const now = new Date();
    const immediatePrompts = (insertedPrompts || []).filter(
      (p: any) => new Date(p.scheduled_for) <= now
    );

    let smsDelivered = 0;
    if (immediatePrompts.length > 0) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("phone_number, assistant_name")
        .eq("id", userId)
        .single();

      if (profile?.phone_number) {
        const assistantName = profile.assistant_name || "Paly";
        for (const prompt of immediatePrompts) {
          const typeLabels: Record<string, string> = {
            takeaway: "Key Takeaway",
            recall: "Quick Recall",
            quiz: "Quiz Time",
            flashcard: "Flashcard",
          };
          const typeLabel = typeLabels[prompt.prompt_type] || "Study Prompt";
          const smsBody = `${assistantName} here! 📚\n\n[${typeLabel} - Day ${prompt.day_index}]\n${className}\n\n${prompt.content}`;

          const result = await sendSms(profile.phone_number, smsBody);
          if (result.success) {
            await supabaseAdmin
              .from("study_prompts")
              .update({ delivered_at: new Date().toISOString() })
              .eq("id", prompt.id);
            smsDelivered++;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: "processed",
        textLength: combinedContent.length,
        synthesizedContentId: savedContent.id,
        nextClassDate: nextClassDate.toISOString().split("T")[0],
        studyDays: numStudyDays,
        promptsScheduled: (insertedPrompts || []).length,
        smsDelivered,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Process upload error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ── Helpers ─────────────────────────────────────────────────────────────

function computeNextClassDate(sessions: { day_of_week: number; start_time: string }[]): Date {
  if (!sessions || sessions.length === 0) {
    // Default: 7 days from now
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  }

  const now = new Date();
  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let minDaysAway = Infinity;

  for (const session of sessions) {
    const targetDay = session.day_of_week;
    const [sh, sm] = session.start_time.split(":");
    const sessionMinutes = parseInt(sh) * 60 + parseInt(sm);

    let daysAway = targetDay - currentDay;
    if (daysAway < 0) daysAway += 7;
    if (daysAway === 0 && currentMinutes >= sessionMinutes) {
      // Class already started/passed today, go to next week
      daysAway = 7;
    }

    if (daysAway < minDaysAway) {
      minDaysAway = daysAway;
    }
  }

  // Must be at least 2 days away (need at least 1 study day)
  if (minDaysAway < 2) minDaysAway += 7;

  const next = new Date(now);
  next.setDate(next.getDate() + minDaysAway);
  next.setHours(0, 0, 0, 0);
  return next;
}

async function callOpenAI(
  content: string,
  className: string,
  numStudyDays: number
): Promise<any> {
  const systemPrompt = `You are an expert study assistant that creates targeted study materials.
Your task is to analyze lecture content and create study materials that will be drip-fed over ${numStudyDays} days.

You must respond with valid JSON only, no markdown or additional text. The JSON structure must be:
{
  "summary": "A 2-3 sentence summary of the main topic",
  "keyTakeaways": ["takeaway 1", "takeaway 2", "takeaway 3", "takeaway 4"],
  "flashcards": [
    {"front": "Question", "back": "Answer"},
    ...at least 5 flashcards
  ],
  "quizQuestions": [
    {
      "question": "Multiple choice question?",
      "options": ["A", "B", "C", "D"],
      "correct_index": 0,
      "explanation": "Why this is correct"
    },
    ...at least 5 questions for the pre-class quiz
  ],
  "dailyChunks": [
    {"day": 1, "content": "Day 1 study content (280-400 chars, SMS-friendly)"},
    {"day": 2, "content": "Day 2 study content"},
    ...exactly ${numStudyDays} chunks
  ]
}

Guidelines for dailyChunks:
- Generate EXACTLY ${numStudyDays} daily chunks
- Day 1 should cover foundational concepts and definitions
- Middle days should progressively deepen understanding with relationships and applications
- Final days should cover nuances, edge cases, and synthesis across topics
- Each chunk must be self-contained and SMS-friendly (280-400 characters)
- Use emojis sparingly to make them engaging
- Each chunk should build on previous ones using spaced repetition principles

Guidelines for quizQuestions:
- Generate at least 5 comprehensive quiz questions
- Cover the full breadth of the material
- Include questions at different difficulty levels
- These will be used as a mandatory pre-class review quiz`;

  const userPrompt = `Analyze these lecture materials from ${className} and create ${numStudyDays} days of study content:

${content.substring(0, 12000)}

Remember: respond with valid JSON only. Generate exactly ${numStudyDays} daily chunks.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("OpenAI API error:", error);
    throw new Error("AI synthesis failed");
  }

  const data = await response.json();
  const aiResponse = data.choices[0].message.content;

  const cleaned = aiResponse
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  const parsed = JSON.parse(cleaned);

  if (!parsed.summary || !parsed.keyTakeaways || !parsed.flashcards || !parsed.dailyChunks) {
    throw new Error("AI response missing required fields");
  }

  return parsed;
}

async function extractPdf(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  console.log("PDF size:", bytes.length, "bytes");

  const base64 = base64Encode(bytes);
  console.log("Base64 length:", base64.length);

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: "Extract ALL text content from this PDF. Return ONLY the raw text, preserving structure with newlines between sections. No commentary or formatting." },
            {
              type: "input_file",
              filename: "document.pdf",
              file_data: `data:application/pdf;base64,${base64}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("GPT PDF extraction failed:", response.status, errText);
    throw new Error(`GPT extraction failed: ${response.status} ${errText.substring(0, 200)}`);
  }

  const data = await response.json();
  let extractedText = "";
  if (data.output) {
    for (const item of data.output) {
      if (item.type === "message" && item.content) {
        for (const c of item.content) {
          if (c.type === "output_text") extractedText += c.text;
        }
      }
    }
  }

  console.log("Extracted text length:", extractedText.trim().length);
  return extractedText.trim();
}

async function extractDocx(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const docXml = zip.file("word/document.xml");
  if (!docXml) return "";

  const xml = await docXml.async("text");
  // Extract text from <w:t> tags
  const paragraphs: string[] = [];
  const paraBlocks = xml.split(/<\/w:p>/);
  for (const block of paraBlocks) {
    const textRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
    let paraText = "";
    let m;
    while ((m = textRegex.exec(block)) !== null) {
      paraText += m[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
    }
    if (paraText.trim()) paragraphs.push(paraText.trim());
  }
  return paragraphs.join("\n");
}

async function extractPptx(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const slideTexts: string[] = [];

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] || "0");
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] || "0");
      return numA - numB;
    });

  for (const slidePath of slideFiles) {
    const xml = await zip.files[slidePath].async("text");
    const text = extractTextFromXml(xml);
    if (text.trim()) {
      const slideNum = slidePath.match(/slide(\d+)/)?.[1] || "?";
      slideTexts.push(`[Slide ${slideNum}]\n${text.trim()}`);
    }
  }

  return slideTexts.join("\n\n");
}

function extractTextFromXml(xml: string): string {
  const paragraphs = xml.split(/<\/a:p>/);
  let result = "";

  for (const para of paragraphs) {
    const regex = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
    let paraText = "";
    let match;
    while ((match = regex.exec(para)) !== null) {
      paraText += match[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
    }
    if (paraText.trim()) {
      result += paraText.trim() + "\n";
    }
  }

  return result;
}
