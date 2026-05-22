const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

const FindingCategories = [
  "Scope",
  "Objectives",
  "Deliverables",
  "Technical Requirements",
  "Schedule & Milestones",
  "Budget & Commercials",
  "Compliance & Standards",
  "Stakeholders",
  "Risks & Constraints",
  "Submission Requirements",
  "Evaluation Criteria",
  "Other",
] as const;

export type Finding = {
  category: (typeof FindingCategories)[number] | string;
  title: string;
  detail: string;
  source_excerpt?: string;
};

export type FindingsResponse = {
  project_title: string;
  client: string;
  project_type?: string;
  location?: string;
  authority?: string;
  development_type?: string;
  land_use_summary?: any[];
  gfa_summary?: any[];
  required_transportation_studies?: any[];
  summary: string;
  findings: Finding[];
};

async function apiPost<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as { error?: string } | TResponse | null;
  if (!response.ok) {
    throw new Error((payload as { error?: string } | null)?.error ?? "API request failed.");
  }
  return payload as TResponse;
}

export function extractFindings(input: { text: string }) {
  return apiPost<FindingsResponse>("/api/findings", input);
}

export function generateProposal(input: { findings: FindingsResponse }) {
  return apiPost<{ markdown: string }>("/api/proposal", input);
}
