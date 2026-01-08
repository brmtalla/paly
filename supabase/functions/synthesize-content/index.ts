import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { content, classId, sessionDate, className } = await req.json();

    if (!content || content.trim().length < 50) {
      return new Response(
        JSON.stringify({ error: "Content too short to synthesize" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert study assistant that helps students learn more effectively. 
Your task is to analyze lecture notes and create comprehensive study materials.

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
    ...at least 3 questions
  ],
  "dailyChunks": [
    {"day": 1, "content": "Day 1 micro-review with emoji (max 280 chars)"},
    {"day": 2, "content": "Day 2 micro-review with emoji"},
    {"day": 3, "content": "Day 3 micro-review with emoji"},
    {"day": 4, "content": "Day 4 micro-review with emoji"},
    {"day": 5, "content": "Day 5 micro-review with emoji"}
  ]
}

Guidelines:
- Flashcards should test key concepts, definitions, and relationships
- Quiz questions should have clear correct answers with helpful explanations
- Daily chunks should be bite-sized reminders that use spaced repetition principles
- Use emojis in daily chunks to make them engaging
- Focus on the most important testable information`;

    const userPrompt = `Please analyze these lecture notes${className ? ` from ${className}` : ''} and create study materials:

${content}

Remember to respond with valid JSON only.`;

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
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", error);
      return new Response(
        JSON.stringify({ error: "AI synthesis failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Parse the JSON response
    let synthesized;
    try {
      // Remove markdown code blocks if present
      const cleanedResponse = aiResponse
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      synthesized = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiResponse);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate required fields
    if (!synthesized.summary || !synthesized.keyTakeaways || !synthesized.flashcards) {
      return new Response(
        JSON.stringify({ error: "AI response missing required fields" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(synthesized),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Synthesis error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


