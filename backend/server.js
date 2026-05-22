import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { z } from "zod";
import { get_encoding } from "tiktoken";

// Load environment variables - MUST be before other imports to avoid undefined env vars
dotenv.config();

const encoding = get_encoding("cl100k_base");

function countTokens(text) {
  if (!text) return 0;
  try {
    return encoding.encode(text).length;
  } catch (e) {
    return 0;
  }
}

function cleanText(text) {
  if (!text) return "";
  return text
    .replace(/[^\S\r\n]+/g, " ") // Replace multiple spaces/tabs (but not newlines) with a single space
    .replace(/[\r\n]{3,}/g, "\n\n") // Replace 3+ newlines with 2
    .trim();
}

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
  priority: z.string().optional().default("Medium"),
  source_excerpt: z.string().optional().default(""),
  source_reference: z.object({
    page: z.string().optional(),
    section: z.string().optional(),
  }).optional(),
});

const FindingsResponseSchema = z.object({
  project_title: z.string().default("Unknown Project"),
  client: z.string().default("Unknown Client"),
  project_type: z.string().optional(),
  location: z.string().optional(),
  authority: z.string().optional(),
  development_type: z.string().optional(),
  land_use_summary: z.array(z.any()).optional().default([]),
  gfa_summary: z.array(z.any()).optional().default([]),
  required_transportation_studies: z.array(z.any()).optional().default([]),
  submission_deadline: z.string().optional(),
  summary: z.string().default(""),
  findings: z.array(FindingSchema).default([]),
}).passthrough();


const FINDINGS_SYSTEM = `
You are a senior transportation engineering, traffic planning, and urban mobility consultancy analyst.

Your role is to review incoming:
- tender documents
- RFPs
- planning submissions
- development briefs
- project proposals
- consultant requests
- client emails

and determine:

- proposed development type
- land use breakdown
- GFA (Gross Floor Area)
- transportation study requirements
- parking analysis requirements
- authority coordination requirements
- proposal qualification requirements
- required consultancy services
- submission obligations
- potential project risks

The consultancy is pre-qualified to conduct:
- Traffic Impact Studies (TIS)
- Traffic Impact Assessments (TIA)
- Parking Studies
- Transportation Planning
- Mobility Assessments
- Access & Circulation Studies
- Traffic Engineering Reports
- Transport Strategy Reports

STRICT ENTERPRISE RULES — NON-NEGOTIABLE:

FACTUALITY:
- NEVER invent, infer, estimate, extrapolate, or assume information.
- NEVER fabricate:
  - land use
  - GFA values
  - parking counts
  - traffic scope
  - methodologies
  - approvals
  - deliverables
  - schedules
  - authorities
  - timelines
  - project scale
  - technical requirements
  - transportation studies
  - staffing
  - pricing
  - compliance claims

MISSING INFORMATION:
- If information is unavailable or unclear:
  use EXACTLY:
  "Not specified in document"

LAND USE EXTRACTION PRIORITY:
Carefully identify and extract:
- residential land use
- commercial land use
- office land use
- retail land use
- hospitality land use
- mixed-use development
- industrial use
- institutional use
- parking-related uses

Preserve terminology EXACTLY as written in source.

GFA EXTRACTION PRIORITY:
Extract ALL:
- GFA values
- built-up areas
- FAR/FSI references
- leasable areas
- area breakdowns
- tower/block areas
- plot areas
- site areas

Preserve:
- units
- numeric formatting
- land-use associations

Do NOT calculate or combine values.

TRANSPORTATION CONSULTANCY ANALYSIS:
Identify whether the project likely requires:
- Traffic Impact Study
- Traffic Impact Assessment
- Parking Analysis
- Trip Generation Analysis
- Mobility Assessment
- Access & Circulation Study
- Road Safety Assessment
- Transportation Planning
- Authority Coordination
- Traffic Simulation

Only identify if explicitly or strongly implied in document context.

AUTHORITY ANALYSIS:
Extract references to:
- municipality approvals
- transport authorities
- RTA requirements
- DOT requirements
- planning approvals
- permitting requirements
- authority submissions

RISK IDENTIFICATION:
Identify:
- missing GFA data
- unclear land use
- incomplete scope
- missing authority details
- missing submission requirements
- conflicting requirements
- unclear transportation scope

SOURCE GROUNDING:
EVERY finding MUST include:
- a short verbatim source excerpt
- copied EXACTLY from source
- max 240 characters
- no paraphrasing

OUTPUT RULES:
- Return ONLY valid JSON.
- No markdown.
- No explanations.
- No commentary.
- No code fences.
`;

const PROPOSAL_SYSTEM = `
You are a senior proposal strategist and technical proposal writer for a transportation engineering and traffic consultancy.

Your responsibility is to prepare a PROFESSIONAL CONSULTANCY PROPOSAL DRAFT using ONLY verified findings extracted from project documents.

The consultancy specializes in:
- Traffic Impact Studies
- Transportation Planning
- Parking Analysis
- Mobility Studies
- Access Assessments
- Traffic Engineering
- Authority Coordination

The proposal is intended to:
- qualify the opportunity
- define transportation consultancy scope
- identify required studies
- support authority approval processes
- prepare an initial consultancy response

STRICT ENTERPRISE RULES — NON-NEGOTIABLE:

FACTUALITY:
- Use ONLY supplied findings.
- NEVER invent:
  - methodologies
  - staffing
  - qualifications
  - authority approvals
  - schedules
  - fees
  - project references
  - compliance claims
  - deliverables
  - technical assumptions
  - transport studies
  - timelines
  - commitments

MISSING INFORMATION:
If information is unavailable:
use EXACTLY:
"[To be confirmed with client]"

CONSULTANCY CONTEXT:
The proposal should sound like a real transportation engineering consultancy responding to a formal development or infrastructure project.

PROPOSAL STYLE:
- formal
- concise
- technically accurate
- enterprise-grade
- consultancy-oriented
- authority-aware
- no marketing language
- no exaggerated claims
- no generic AI wording

COMPLIANCE RULES:
- Do NOT promise authority approvals.
- Do NOT guarantee outcomes.
- Do NOT claim regulatory acceptance.
- Do NOT invent commercial figures.
- Do NOT generate fictional schedules.

OUTPUT RULES:
- Output Markdown only.
- Use ## headings only for sections.
- Use **bold** for emphasis on key terms.
- For lists, use a simple dash (-) followed by a space.
- Ensure each point is on a NEW LINE.
- No code fences.
- No special symbols, decorative characters, or emojis.
- No arrows (->, =>).
- Keep the language clean and professional.
`;

function findingsPrompt(text) {
  return `
Analyze the following transportation, urban development, planning, or infrastructure project document.

Extract ONLY explicitly supported information.

Return JSON with EXACTLY this structure:

{
  "project_title": "",
  "client": "",
  "project_type": "",
  "location": "",
  "authority": "",
  "development_type": "",
  "land_use_summary": [],
  "gfa_summary": [],
  "required_transportation_studies": [],
  "submission_deadline": "",
  "summary": "",
  "findings": [
    {
      "category": "Land Use" | "GFA" | "Transportation Studies" | "Parking Requirements" | "Traffic Requirements" | "Authority Requirements" | "Scope" | "Deliverables" | "Submission Requirements" | "Risks & Constraints" | "Other",

      "title": "",

      "detail": "",

      "priority": "High" | "Medium" | "Low",

      "source_excerpt": "",

      "source_reference": {
        "page": "",
        "section": ""
      }
    }
  ]
}

IMPORTANT EXTRACTION PRIORITIES:
1. Land use breakdowns
2. GFA tables and area schedules
3. Transportation study requirements
4. Parking requirements
5. Authority approval requirements
6. Submission obligations
7. Required consultancy services
8. Missing client information
9. Development scale and complexity
10. Traffic engineering scope indicators

SPECIAL INSTRUCTIONS:
- Prefer operationally useful findings over generic summaries.
- Extract tables if they contain GFA or land-use information.
- Preserve engineering terminology.
- Do NOT duplicate findings.
- Keep findings concise and factual.
- Limit to maximum 15-20 high-quality findings to avoid response truncation.

DOCUMENT:
"""
${text.slice(0, 180000)}
"""
`;
}

function proposalPrompt(findings) {
  return `
Prepare a transportation engineering consultancy proposal draft using ONLY the verified findings below.

The proposal should help:
- define consultancy scope
- identify required transportation studies
- support authority coordination
- prepare a professional response to the client

DO NOT INVENT INFORMATION.

MANDATORY RULES:
- Missing information:
  "[To be confirmed with client]"
- No fabricated methodologies.
- No fabricated timelines.
- No fabricated staffing.
- No fabricated pricing.
- No fabricated authority approvals.
- No invented project understanding.

Use EXACTLY these sections:

## Executive Summary
## Understanding of Proposed Development
## Land Use & GFA Understanding
## Required Transportation Studies
## Proposed Scope of Services
## Authority Coordination Requirements
## Proposed Technical Approach
## Deliverables
## Client Inputs Required
## Assumptions & Exclusions
## Risk Considerations
## Commercial Summary
## Submission Compliance Checklist

PROJECT TITLE:
${findings.project_title}

CLIENT:
${findings.client}

PROJECT TYPE:
${findings.project_type}

LOCATION:
${findings.location}

AUTHORITY:
${findings.authority}

DEVELOPMENT TYPE:
${findings.development_type}

LAND USE SUMMARY:
${JSON.stringify(findings.land_use_summary, null, 2)}

GFA SUMMARY:
${JSON.stringify(findings.gfa_summary, null, 2)}

REQUIRED TRANSPORTATION STUDIES:
${JSON.stringify(findings.required_transportation_studies, null, 2)}

PROJECT SUMMARY:
${findings.summary}

VERIFIED FINDINGS:
${JSON.stringify(findings.findings, null, 2)}

ADDITIONAL COMPOSITION RULES:
- Scope items must directly map to extracted findings.
- Use clear, separate lines for each point or list item.
- Do not use special characters or symbols like arrows or custom bullets.
- Use standard Markdown bolding (**text**) for emphasis.
- Ensure points strictly start on new lines.
- Mention missing client inputs where relevant.
- Keep technical approach generic if methodology is not specified.
- Commercial section must NEVER invent figures.
- Submission checklist must include ONLY explicitly identified requirements.
`;
}


async function callGemini(systemPrompt, userPrompt, jsonMode = false) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the backend.");
  }

  const inputTokens = countTokens(systemPrompt + userPrompt);

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
  const candidate = data.candidates?.[0];
  
  if (!candidate) {
    console.error("No candidates in Gemini response:", JSON.stringify(data));
    throw new Error("Gemini returned no response candidates.");
  }

  const text = candidate.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  const outputTokens = countTokens(text);

  console.log(`[Gemini API] Tokens -> Input: ${inputTokens} | Output: ${outputTokens} | Total: ${inputTokens + outputTokens}`);

  if (candidate.finishReason && candidate.finishReason !== "STOP") {
    console.warn(`Gemini finish reason: ${candidate.finishReason}`);
    if (candidate.finishReason === "MAX_TOKENS") {
      console.error("Gemini response was truncated due to token limit.");
    }
  }
  
  if (!text) {
    if (candidate.finishReason === "SAFETY") {
      throw new Error("Gemini response was blocked by safety filters.");
    }
    throw new Error(`Gemini returned an empty response. Finish reason: ${candidate.finishReason}`);
  }

  return text;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/findings", async (req, res, next) => {
  try {
    const input = z.object({ text: z.string().trim().min(50) }).parse(req.body);
    const cleanedInput = cleanText(input.text);
    const raw = await callGemini(FINDINGS_SYSTEM, findingsPrompt(cleanedInput), true);
    const cleaned = raw.replace(/```json\s*|\s*```/g, "").trim();
    if (!cleaned) {
      throw new Error("Gemini returned an empty response after cleaning.");
    }
    try {
      const result = FindingsResponseSchema.parse(JSON.parse(cleaned));
      res.json(result);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", cleaned);
      throw new Error(`Invalid JSON response from AI: ${parseError.message}`);
    }
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
