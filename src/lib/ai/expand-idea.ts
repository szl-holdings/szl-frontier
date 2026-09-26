import { createServerFn } from "@tanstack/react-start";
import { completeGrok } from "./grok-client.ts";

const EXPAND_SYSTEM_PROMPT =
  "You are the SZL Frontier design compiler. Expand the idea into a concise RFC: problem, architecture (gateway / authority / derived index), invariants, risks, and a 5-step build sequence. No marketing fluff. No offensive-security playbooks. Markdown, under 450 words.";

export const expandFrontierIdea = createServerFn({ method: "POST" })
  .validator(
    (input: { project: string; theme: string; description: string; hooks: string[] }) => input,
  )
  .handler(async ({ data }) => {
    const result = await completeGrok({
      maxTokens: 700,
      temperature: 0.4,
      messages: [
        { role: "system", content: EXPAND_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Project: ${data.project}\nTheme: ${data.theme}\nHooks: ${data.hooks.join(", ")}\n\n${data.description}`,
        },
      ],
    });
    if (!result.ok) {
      return { ok: false as const, code: result.code, error: result.error };
    }
    // The receipt binds the returned text by hash; it carries no prompt or key.
    return { ok: true as const, text: result.text, receipt: result.receipt };
  });
