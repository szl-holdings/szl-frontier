import { createServerFn } from "@tanstack/react-start";

export const expandFrontierIdea = createServerFn({ method: "POST" })
  .validator(
    (input: { project: string; theme: string; description: string; hooks: string[] }) => input,
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "AI expansion is unavailable in this environment" };
    }
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 700,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "You are the SZL Frontier design compiler. Expand the idea into a concise RFC: problem, architecture (gateway / authority / derived index), invariants, risks, and a 5-step build sequence. No marketing fluff. No offensive-security playbooks. Markdown, under 450 words.",
          },
          {
            role: "user",
            content: `Project: ${data.project}\nTheme: ${data.theme}\nHooks: ${data.hooks.join(", ")}\n\n${data.description}`,
          },
        ],
      }),
    });
    if (!res.ok) {
      return { ok: false as const, error: `Expansion failed (${res.status})` };
    }
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) return { ok: false as const, error: "Empty expansion" };
    return { ok: true as const, text };
  });
