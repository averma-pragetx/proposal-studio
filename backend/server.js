import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { z } from "zod";
import { callAI } from "./ai/client.js";
import {
  FINDINGS_SYSTEM,
  PROPOSAL_SYSTEM,
  EDIT_SYSTEM,
  findingsPrompt,
  proposalPrompt,
  editPrompt,
} from "./ai/prompts.js";

// Load environment variables - MUST be before other imports to avoid undefined env vars
dotenv.config();

function cleanText(text) {
  if (!text) return "";
  return text
    .replace(/[^\S\r\n]+/g, " ") // Replace multiple spaces/tabs (but not newlines) with a single space
    .replace(/[\r\n]{3,}/g, "\n\n") // Replace 3+ newlines with 2
    .trim();
}

const app = express();
const port = Number(process.env.PORT ?? 5000);

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

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/findings", async (req, res, next) => {
  try {
    const input = z.object({ text: z.string().trim().min(50) }).parse(req.body);
    const cleanedInput = cleanText(input.text);
    const raw = await callAI(FINDINGS_SYSTEM, findingsPrompt(cleanedInput), true);
    const cleaned = raw.replace(/```json\s*|\s*```/g, "").trim();
    if (!cleaned) {
      throw new Error("OpenAI returned an empty response after cleaning.");
    }
    try {
      const result = FindingsResponseSchema.parse(JSON.parse(cleaned));
      res.json(result);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", cleaned);
      throw new Error(`Invalid JSON response from AI: ${parseError.message}`);
    }
  } catch (error) {
    next(error);
  }
});

app.post("/api/proposal", async (req, res, next) => {
  try {
    const input = z.object({ findings: FindingsResponseSchema }).parse(req.body);
    const markdown = await callAI(PROPOSAL_SYSTEM, proposalPrompt(input.findings), false);
    res.json({ markdown: markdown.trim() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/edit-proposal", async (req, res, next) => {
  try {
    const { proposal, query, history } = z.object({
      proposal: z.string(),
      query: z.string(),
      history: z.array(z.object({ query: z.string() })).optional().default([]),
    }).parse(req.body);

    const updatedMarkdown = await callAI(EDIT_SYSTEM, editPrompt(proposal, query, history), false);
    res.json({ markdown: updatedMarkdown.trim() });
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
