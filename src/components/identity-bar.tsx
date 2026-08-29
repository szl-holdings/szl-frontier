import type { ReactNode } from "react";
import { AGENTS, TENANTS, useOrchestrator } from "@/stores/orchestrator";
import type { Purpose } from "@/lib/covenant/types";
import { Select } from "@/components/ui/select";

const PURPOSES: Purpose[] = [
  "evidence-write",
  "governed-recall",
  "policy-review",
  "mesh-dispatch",
  "evaluation",
  "adversarial-test",
  "ingest",
  "intel-read",
  "action-execute",
];

export function IdentityBar() {
  const session = useOrchestrator((s) => s.session);
  const setSession = useOrchestrator((s) => s.setSession);

  return (
    <div className="grid gap-3 rounded-xl bg-bg-elevated p-4 shadow-[inset_0_0_0_1px_var(--color-border)] sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Principal">
        <Select
          value={session.agentId}
          onChange={(e) => setSession({ agentId: e.target.value })}
        >
          {AGENTS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Tenant">
        <Select
          value={session.tenantId}
          onChange={(e) => {
            const t = TENANTS.find((x) => x.id === e.target.value);
            setSession({ tenantId: e.target.value, securityDomain: t?.domain ?? session.securityDomain });
          }}
        >
          {TENANTS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Purpose">
        <Select
          value={session.purpose}
          onChange={(e) => setSession({ purpose: e.target.value as Purpose })}
        >
          {PURPOSES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Domain">
        <div className="flex h-10 items-center rounded-md border border-border bg-bg px-3 font-mono text-xs text-muted">
          {session.securityDomain}
        </div>
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-subtle">{label}</div>
      {children}
    </label>
  );
}
