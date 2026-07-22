export interface AgentWizardConfig {
  name: string;
  temperature: number;
  prompt: string;
}

export function parseAgentWizardResponse(response: string): AgentWizardConfig | null {
  const cleaned = response
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  const candidates = [cleaned, cleaned.match(/\{[\s\S]*\}/)?.[0]].filter((candidate): candidate is string =>
    Boolean(candidate)
  );

  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (isAgentWizardConfig(parsed)) return parsed;
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

function isAgentWizardConfig(value: unknown): value is AgentWizardConfig {
  if (!value || typeof value !== "object") return false;
  const config = value as Record<string, unknown>;
  return (
    typeof config.name === "string" &&
    config.name.trim().length > 0 &&
    typeof config.temperature === "number" &&
    Number.isFinite(config.temperature) &&
    config.temperature >= 0 &&
    config.temperature <= 2 &&
    typeof config.prompt === "string" &&
    config.prompt.trim().length > 0
  );
}
