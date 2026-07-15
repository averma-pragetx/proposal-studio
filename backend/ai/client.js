import Anthropic from "@anthropic-ai/sdk";
import { get_encoding } from "tiktoken";

const encoding = get_encoding("cl100k_base");
const openaiUrl = "https://api.openai.com/v1/chat/completions";

// Active provider. Set AI_PROVIDER=openai|gemini in .env to switch back.
export function callAI(systemPrompt, userPrompt, jsonMode = false) {
  switch (process.env.AI_PROVIDER) {
    case "openai":
      return callOpenAI(systemPrompt, userPrompt, jsonMode);
    case "gemini":
      return callGemini(systemPrompt, userPrompt, jsonMode);
    default:
      return callClaude(systemPrompt, userPrompt, jsonMode);
  }
}

export async function callClaude(systemPrompt, userPrompt, jsonMode = false) {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error("CLAUDE_API_KEY is not configured on the backend.");
  }

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: process.env.CLAUDE_MODEL ?? "claude-opus-4-8",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: jsonMode
      ? `${systemPrompt}\n\nRespond with a single valid JSON object only — no markdown fences, no prose.`
      : systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  console.log(
    `[Claude API] Tokens -> Input: ${response.usage.input_tokens} | Output: ${response.usage.output_tokens} | Total: ${response.usage.input_tokens + response.usage.output_tokens}`
  );

  if (!text) {
    throw new Error("Claude returned an empty response.");
  }

  return text;
}

function countTokens(text) {
  if (!text) return 0;
  try {
    return encoding.encode(text).length;
  } catch (e) {
    return 0;
  }
}

export async function callGemini(systemPrompt, userPrompt, jsonMode = false) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the backend.");
  }

  const model = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";
  const inputTokens = countTokens(systemPrompt + userPrompt);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.9,
          maxOutputTokens: 8192, // thinking tokens count against this on 2.5 models
          ...(jsonMode ? { responseMimeType: "application/json" } : {}),
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText.slice(0, 500)}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  const outputTokens = countTokens(text);

  console.log(`[Gemini API] Tokens -> Input: ${inputTokens} | Output: ${outputTokens} | Total: ${inputTokens + outputTokens}`);

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}

export async function callOpenAI(systemPrompt, userPrompt, jsonMode = false) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured on the backend.");
  }

  const inputTokens = countTokens(systemPrompt + userPrompt);

  const response = await fetch(openaiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-5.4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      top_p: 0.9,
      max_completion_tokens: 4096,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorText.slice(0, 500)}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  const outputTokens = countTokens(text);

  console.log(`[OpenAI API] Tokens -> Input: ${inputTokens} | Output: ${outputTokens} | Total: ${inputTokens + outputTokens}`);

  if (!text) {
    throw new Error("OpenAI returned an empty response.");
  }

  return text;
}
