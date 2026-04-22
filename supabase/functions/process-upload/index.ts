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
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Server configuration error: AI service unavailable" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { uploadId, filePath, fileType, classId, userId, sessionDate, skipExtraction, extractOnly, singleUploadId } = await req.json();

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

    // ── Step 4: Gather content ────────────────────────────────────────
    let uploadsContent = "";
    let notesContent = "";
    let targetUploadIds: string[] = [];
    let noteIds: string[] = [];

    if (singleUploadId) {
      const { data: singleUpload } = await supabaseAdmin
        .from("uploads")
        .select("id, extracted_text")
        .eq("id", singleUploadId)
        .single();

      if (singleUpload?.extracted_text) {
        uploadsContent = singleUpload.extracted_text;
        targetUploadIds = [singleUpload.id];
      }
    } else {
      const { data: allUploads } = await supabaseAdmin
        .from("uploads")
        .select("id, extracted_text")
        .eq("class_id", classId)
        .eq("user_id", userId)
        .eq("session_date", sessionDate || today.toISOString().split("T")[0])
        .not("extracted_text", "is", null);

      uploadsContent = allUploads?.map((u: any) => u.extracted_text).filter(Boolean).join("\n\n") || "";
      targetUploadIds = allUploads?.map((u: any) => u.id) || [];

      const { data: fetchedNotes } = await supabaseAdmin
        .from("notes")
        .select("id, content")
        .eq("class_id", classId)
        .eq("user_id", userId)
        .eq("session_date", sessionDate || today.toISOString().split("T")[0]);

      notesContent = fetchedNotes?.map((n: any) => n.content).filter(Boolean).join("\n\n") || "";
      noteIds = fetchedNotes?.map((n: any) => n.id) || [];
    }

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
        source_note_ids: noteIds,
        source_upload_ids: targetUploadIds,
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
    if (noteIds.length > 0) {
      await supabaseAdmin
        .from("notes")
        .update({ is_synthesized: true })
        .in("id", noteIds);
    }

    // ── Copyright safety: delete raw PDF files and extracted text ─────
    // Class lecture materials are often copyrighted, so we remove the raw
    // content from storage once synthesis is complete. The upload row is
    // kept (with metadata) so the UI can still show a "Synthesized" history.
    if (targetUploadIds.length > 0) {
      const { data: uploadsToClean } = await supabaseAdmin
        .from("uploads")
        .select("id, file_path")
        .in("id", targetUploadIds);

      if (uploadsToClean && uploadsToClean.length > 0) {
        const paths = uploadsToClean
          .map((u: any) => u.file_path)
          .filter((p: any) => !!p);

        if (paths.length > 0) {
          const { error: removeError } = await supabaseAdmin.storage
            .from("uploads")
            .remove(paths);
          if (removeError) {
            console.error("Storage cleanup error:", removeError);
          }
        }

        await supabaseAdmin
          .from("uploads")
          .update({ extracted_text: null, file_path: "" })
          .in("id", targetUploadIds);
      }
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
  const systemPrompt = `You are an expert study assistant that creates thorough, detailed study materials from lecture content.
Your task is to deeply analyze ALL of the provided lecture material and produce comprehensive study materials that will be drip-fed over ${numStudyDays} days.

You must respond with valid JSON only, no markdown or additional text. The JSON structure must be:
{
  "summary": "A thorough 2-3 paragraph summary that covers the full scope of the material, key themes, and how concepts connect to each other",
  "keyTakeaways": ["detailed takeaway 1", "detailed takeaway 2", ...8-12 takeaways],
  "flashcards": [
    {"front": "Specific question testing a concept", "back": "Thorough answer with context and explanation", "day": 1},
    ...15-25 flashcards covering every major concept, definition, relationship, and application
  ],
  "quizQuestions": [
    {
      "question": "Multiple choice question?",
      "options": ["A", "B", "C", "D"],
      "correct_index": 0,
      "explanation": "Detailed explanation of why the correct answer is right and why each wrong answer is wrong"
    },
    ...10-15 questions at varying difficulty levels
  ],
  "dailyChunks": [
    {"day": 1, "content": "• KEY TERM: Definition and context\n• CONCEPT 2: Explanation\n• CONCEPT 3: Explanation with example\n...5-10 bullets per day"},
    {"day": 2, "content": "• NEXT CONCEPT: Explanation\n..."},
    ...exactly ${numStudyDays} chunks
  ]
}

Guidelines for summary:
- Write 2-3 substantial paragraphs, not just a few sentences
- Cover the full breadth of topics in the source material
- Explain how concepts relate to each other

Guidelines for keyTakeaways:
- Generate 8-12 detailed takeaways
- Each takeaway itself is a single bullet — write it as a concise, complete thought (1-3 sentences)
- Cover definitions, relationships, processes, and applications

Guidelines for flashcards:
- Generate 15-25 flashcards that comprehensively cover the material
- Include cards for: definitions, processes/mechanisms, comparisons, cause-effect relationships, applications, and edge cases
- Backs should be detailed explanations (2-4 sentences), not one-word answers
- Test at multiple difficulty levels from basic recall to applied understanding
- Each flashcard MUST have a "day" field (integer 1 to ${numStudyDays}) indicating when it unlocks
- Distribute flashcards EVENLY across all ${numStudyDays} days — foundational cards on early days, advanced cards on later days
- Cards that build on earlier concepts should have a higher day number

Guidelines for quizQuestions:
- Generate 10-15 comprehensive quiz questions
- Mix difficulty levels: ~30% basic recall, ~40% application/analysis, ~30% synthesis/evaluation
- Wrong answer options should be plausible (common misconceptions)
- Explanations should teach — explain the reasoning, not just state the answer

Guidelines for dailyChunks:
- Generate EXACTLY ${numStudyDays} daily chunks
- Each chunk must be 800-1300 characters — thorough and information-dense
- CRITICAL FORMAT: Each chunk MUST be formatted as bullet points ONLY, NOT dense paragraphs
- Start each bullet with "• " (bullet character + space) on its own line, separated by "\\n"
- Each chunk should contain 5-10 bullets covering that day's topic
- Example format for a chunk's content field:
  "• CONTRACT FORMATION: A binding agreement requires offer, acceptance, and consideration\\n• OFFER: A clear proposal showing intent to be bound by specific terms\\n• ACCEPTANCE: Unqualified agreement to the offer's exact terms (mirror image rule)\\n• CONSIDERATION: Something of value exchanged — money, goods, services, or a promise\\n• Without all three elements, no enforceable contract exists"
- Each bullet should be a complete, standalone concept (1-2 sentences max)
- Use ALL CAPS for key terms at the start of bullets when introducing a concept
- Day 1: foundational definitions, core vocabulary, and the big picture framework
- Early days: detailed breakdowns of each major concept with examples
- Middle days: relationships between concepts, processes, mechanisms, cause-and-effect
- Later days: applications, edge cases, comparisons, and common misconceptions
- Final day(s): synthesis across all topics, connections to broader themes, exam-style thinking
- Distribute the source material EVENLY across all ${numStudyDays} days — every section of the content should be covered
- Use spaced repetition: briefly reference earlier concepts when introducing related ones
- NEVER write a chunk as a single flowing paragraph — ALWAYS use the bullet format described above`;

  const userPrompt = `Analyze these lecture materials from ${className} and create ${numStudyDays} days of thorough, detailed study content. Extract ALL important information — every definition, concept, process, relationship, and example. Do not summarize lightly; the student needs to learn this material in depth.

${content.substring(0, 100000)}

Remember: respond with valid JSON only. Generate exactly ${numStudyDays} daily chunks, each 1000-1500 characters. Be thorough.`;

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
      max_tokens: 16000,
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
