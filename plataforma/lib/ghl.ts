// Helpers puros de la integración con GoHighLevel (testeables sin red).

export type StoryWithMetrics = {
  story_metrics: Array<{
    reach: number | null;
    total_interactions: number | null;
    snapshot_at: string;
  }>;
};

export type CampaignTotals = { reach: number; interactions: number; stories: number };

// Suma el snapshot más reciente de cada story de una asignación.
export function computeCampaignTotals(stories: StoryWithMetrics[]): CampaignTotals {
  let reach = 0;
  let interactions = 0;
  for (const s of stories) {
    const latest = [...(s.story_metrics ?? [])].sort((a, b) =>
      b.snapshot_at.localeCompare(a.snapshot_at),
    )[0];
    reach += latest?.reach ?? 0;
    interactions += latest?.total_interactions ?? 0;
  }
  return { reach, interactions, stories: stories.length };
}

// GHL busca por texto libre; asegurar match EXACTO de email (case-insensitive).
export function matchContactByEmail<T extends { email: string | null }>(
  contacts: T[],
  email: string,
): T | undefined {
  const clean = email.trim().toLowerCase();
  return contacts.find((c) => c.email?.toLowerCase() === clean);
}
