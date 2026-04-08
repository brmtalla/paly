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
    const { content, classId, sessionDate, className, numStudyDays: requestedDays } = await req.json();

    if (!content || content.trim().length < 50) {
      return new Response(
        JSON.stringify({ error: "Content too short to synthesize" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const numStudyDays = Math.max(1, Math.min(requestedDays || 7, 14));

    const systemPrompt = `You are an expert study assistant that creates thorough, detailed study materials from lecture content.
Your task is to deeply analyze ALL of the provided material and produce comprehensive study materials that will be drip-fed over ${numStudyDays} days.

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
    {"day": 1, "content": "Thorough day 1 study content (1000-1500 chars)"},
    {"day": 2, "content": "Thorough day 2 study content (1000-1500 chars)"},
    ...exactly ${numStudyDays} chunks
  ]
}

Guidelines for summary:
- Write 2-3 substantial paragraphs, not just a few sentences
- Cover the full breadth of topics in the source material
- Explain how concepts relate to each other

Guidelines for keyTakeaways:
- Generate 8-12 detailed takeaways
- Each should be 1-3 sentences explaining the concept, not just naming it
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
- Each chunk must be 1000-1500 characters — thorough and information-dense
- Structure each chunk with clear formatting: use bullet points (•), key terms in ALL CAPS, and logical groupings
- Day 1: foundational definitions, core vocabulary, and the big picture framework
- Early days: detailed breakdowns of each major concept with examples
- Middle days: relationships between concepts, processes, mechanisms, cause-and-effect
- Later days: applications, edge cases, comparisons, and common misconceptions
- Final day(s): synthesis across all topics, connections to broader themes, exam-style thinking
- Each chunk should feel like a mini-lecture recap, not a tweet
- Distribute the source material EVENLY across all ${numStudyDays} days — every section of the content should be covered
- Use spaced repetition: briefly reference earlier concepts when introducing related ones`;

    const userPrompt = `Analyze these lecture notes${className ? ` from ${className}` : ''} and create ${numStudyDays} days of thorough, detailed study content. Extract ALL important information — every definition, concept, process, relationship, and example. Do not summarize lightly; the student needs to learn this material in depth.

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


