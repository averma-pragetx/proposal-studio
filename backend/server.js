import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { z } from "zod";

// Load environment variables - MUST be before other imports to avoid undefined env vars
dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 5000);
const geminiModel = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`;

app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:8080" }));
app.use(express.json({ limit: "10mb" }));

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

const FINDINGS_SYSTEM = `You are a senior engineering and traffic consultancy analyst. You read tender, RFP, and project briefing documents and extract STRUCTURED, FACTUAL key findings.

STRICT RULES - NON-NEGOTIABLE:
- Do NOT invent facts, numbers, dates, names, scope items, or requirements that are not in the source.
- If information is missing, write "Not specified in document" - never guess.
- Quote short verbatim source excerpts (max 240 chars) to ground each finding.
- Prefer precise technical language used in engineering/traffic consulting.
- Output ONLY valid JSON matching the requested schema. No markdown, no commentary.`;

const PROPOSAL_SYSTEM = `You are a senior proposal writer for an engineering and traffic consultancy.

STRICT RULES - NON-NEGOTIABLE:
- Base the proposal STRICTLY on the supplied findings. Do not invent capabilities, references, numbers, team members, or claims.
- Where a detail is missing, write a clearly bracketed placeholder like "[To be confirmed: ...]" - never fabricate.
- Use a confident, professional, enterprise tone. No marketing fluff.
- Use precise engineering / traffic consultancy terminology.
- Produce well-structured Markdown with clear headings (##) and bullet points where appropriate.
- Do NOT wrap output in code fences.`;

function findingsPrompt(text) {
  return `Extract key findings from the following tender/project document.

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
}

function proposalPrompt(findings) {
  return `Draft a proposal document for the project below, using ONLY the verified findings supplied.

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
}

async function callGemini(systemPrompt, userPrompt, jsonMode = false) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the backend.");
  }

  const response = await fetch(`${geminiUrl}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.2,
        topP: 0.9,
        maxOutputTokens: 8192,
        ...(jsonMode ? { responseMimeType: "application/json" } : {}),
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText.slice(0, 500)}`);
  }

  const data = await response.json();
  const text =
    data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/findings", async (req, res, next) => {
  try {
    const input = z.object({ text: z.string().trim().min(50) }).parse(req.body);
    const raw = await callGemini(FINDINGS_SYSTEM, findingsPrompt(input.text), true);
    const cleaned = raw.replace(/```json\s*|\s*```/g, "").trim();
    const result = FindingsResponseSchema.parse(JSON.parse(cleaned));
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/api/proposal", async (req, res, next) => {
  try {
    const input = z.object({ findings: FindingsResponseSchema }).parse(req.body);
    const markdown = await callGemini(PROPOSAL_SYSTEM, proposalPrompt(input.findings), false);
    res.json({ markdown: markdown.trim() });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: error.issues[0]?.message ?? "Invalid request body." });
  }
  res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error." });
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
