import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const FindingSchema = z.object({
  category: z.string(),
  title: z.string(),
  detail: z.string(),
  source_excerpt: z.string().optional().default(""),
});

const FindingsResponseSchema = z.object({
  project_title: z.string(),
  client: z.string(),
  summary: z.string(),
  findings: z.array(FindingSchema),
});

export type Finding = z.infer<typeof FindingSchema>;
export type FindingsResponse = z.infer<typeof FindingsResponseSchema>;

async function callGemini(systemPrompt: string, userPrompt: string, jsonMode = false): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.2,
      topP: 0.9,
      maxOutputTokens: 8192,
      ...(jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
}

const FINDINGS_SYSTEM = `You are a senior engineering and traffic consultancy analyst. You read tender, RFP, and project briefing documents and extract STRUCTURED, FACTUAL key findings.

STRICT RULES — NON-NEGOTIABLE:
- Do NOT invent facts, numbers, dates, names, scope items, or requirements that are not in the source.
- If information is missing, write "Not specified in document" — never guess.
- Quote short verbatim source excerpts (max 240 chars) to ground each finding.
- Prefer precise technical language used in engineering/traffic consulting.
- Output ONLY valid JSON matching the requested schema. No markdown, no commentary.`;

const FINDINGS_USER = (text: string) => `Extract key findings from the following tender/project document.

Return JSON with this exact shape:
{
  "project_title": string,
  "client": string,
  "summary": string (3-5 sentences, factual, no fluff),
  "findings": [
    {
      "category": one of "Scope", "Objectives", "Deliverables", "Technical Requirements", "Schedule & Milestones", "Budget & Commercials", "Compliance & Standards", "Stakeholders", "Risks & Constraints", "Submission Requirements", "Evaluation Criteria", "Other",
      "title": string (short label),
      "detail": string (concise, factual, 1-3 sentences),
      "source_excerpt": short verbatim quote from the document supporting this finding (max 240 chars)
    }
  ]
}

If a field cannot be found, use "Not specified in document".

DOCUMENT:
"""
${text.slice(0, 120000)}
"""`;

export const extractFindings = createServerFn({ method: "POST" })
  .inputValidator((input: { text: string }) => {
    if (!input?.text || typeof input.text !== "string") {
      throw new Error("Document text is required.");
    }
    if (input.text.trim().length < 50) {
      throw new Error("Document text is too short to analyse.");
    }
    return { text: input.text };
  })
  .handler(async ({ data }) => {
    const raw = await callGemini(FINDINGS_SYSTEM, FINDINGS_USER(data.text), true);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Best-effort: strip code fences if model added them
      const cleaned = raw.replace(/```json\s*|\s*```/g, "").trim();
      parsed = JSON.parse(cleaned);
    }
    const result = FindingsResponseSchema.parse(parsed);
    return result;
  });

const PROPOSAL_SYSTEM = `You are a senior proposal writer for an engineering and traffic consultancy.

STRICT RULES — NON-NEGOTIABLE:
- Base the proposal STRICTLY on the supplied findings. Do not invent capabilities, references, numbers, team members, or claims.
- Where a detail is missing, write a clearly bracketed placeholder like "[To be confirmed: ...]" — never fabricate.
- Use a confident, professional, enterprise tone. No marketing fluff.
- Use precise engineering / traffic consultancy terminology.
- Produce well-structured Markdown with clear headings (##) and bullet points where appropriate.
- Do NOT wrap output in code fences.`;

const PROPOSAL_USER = (findings: FindingsResponse) => `Draft a proposal document for the project below, using ONLY the verified findings supplied.

Required sections (use ## headings in this order):
1. Executive Summary
2. Understanding of the Project
3. Scope of Services
4. Proposed Methodology & Approach
5. Deliverables
6. Project Schedule
7. Team & Qualifications  (use [To be confirmed: ...] placeholders where info is missing)
8. Compliance & Standards
9. Risk Management
10. Commercial Summary  (use [To be confirmed: ...] for figures not provided)
11. Submission Compliance Checklist

PROJECT TITLE: ${findings.project_title}
CLIENT: ${findings.client}
SUMMARY: ${findings.summary}

VERIFIED FINDINGS (JSON):
${JSON.stringify(findings.findings, null, 2)}`;

export const generateProposal = createServerFn({ method: "POST" })
  .inputValidator((input: { findings: FindingsResponse }) => {
    const findings = FindingsResponseSchema.parse(input.findings);
    return { findings };
  })
  .handler(async ({ data }) => {
    const markdown = await callGemini(PROPOSAL_SYSTEM, PROPOSAL_USER(data.findings), false);
    return { markdown: markdown.trim() };
  });
