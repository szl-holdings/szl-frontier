import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Anchor,
  Brain,
  Compass,
  Cpu,
  Database,
  FileInput,
  Globe,
  LayoutGrid,
  Link2,
  Menu,
  Network,
  Radio,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SzlMark } from "@/components/mark";
import { Button } from "@/components/ui/button";
import { brainStatusPresentation } from "@/lib/brain/status";
import { cn } from "@/lib/utils";
import { paintLabel, paintTone } from "@/lib/ouroboros/paint";
import { useOrchestrator } from "@/stores/orchestrator";

const NAV = [
  { to: "/", label: "Command", icon: LayoutGrid },
  { to: "/memory", label: "Memory", icon: Database },
  { to: "/ingest", label: "Ingest", icon: FileInput },
  { to: "/models", label: "Models", icon: Cpu },
  { to: "/intel", label: "Intel", icon: Globe },
  { to: "/actions", label: "Actions", icon: Radio },
  { to: "/adversary", label: "Adversary", icon: ShieldAlert },
  { to: "/brain", label: "Brain", icon: Brain },
  { to: "/frontier", label: "Frontier", icon: Compass },
  { to: "/harbor", label: "Harbor", icon: Anchor },
  { to: "/mesh", label: "Mesh", icon: Network },
  { to: "/proof", label: "Proof", icon: Link2 },
  { to: "/gates", label: "Gates", icon: ShieldCheck },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hydrate = useOrchestrator((s) => s.hydrate);
  const ready = useOrchestrator((s) => s.ready);
  const brainAlive = useOrchestrator((s) => s.brainAlive);
  const brainReady = useOrchestrator((s) => s.brainReady);
  const pulseBrain = useOrchestrator((s) => s.pulseBrain);
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const main = useRef<HTMLElement>(null);

  useEffect(() => {
    void hydrate();
    return useOrchestrator.persist.onFinishHydration(() => {
      void hydrate();
    });
  }, [hydrate]);

  useEffect(() => {
    if (!ready || !brainAlive || !brainReady) return;
    const id = window.setInterval(() => {
      void pulseBrain();
    }, 8000);
    void pulseBrain();
    return () => window.clearInterval(id);
  }, [ready, brainAlive, brainReady, pulseBrain]);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      menuButton.current?.focus();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function navigateFromMenu() {
    setOpen(false);
    main.current?.focus();
  }

  return (
    <div className="frontier-shell min-h-dvh bg-bg text-fg">
      <a className="frontier-skip-link" href="#frontier-main">Skip to workspace</a>
      <div className="flex min-h-dvh">
        <aside className="frontier-sidebar sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border md:flex">
          <Brand />
          <div className="min-h-0 flex-1 overflow-y-auto pb-4">
            <p className="frontier-nav-label">Workspaces</p>
            <Nav pathname={pathname} />
          </div>
          <PlaneStatus />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="frontier-mobile-header sticky top-0 z-20 flex min-h-20 items-center justify-between gap-2 border-b border-border px-4 md:hidden">
            <Brand compact />
            <Button
              ref={menuButton}
              variant="ghost"
              size="icon"
              className="frontier-menu-toggle"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="frontier-mobile-nav"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X /> : <Menu />}
            </Button>
          </header>
          <div id="frontier-mobile-nav" hidden={!open} className="frontier-mobile-nav border-b border-border bg-bg-elevated px-1 py-3 md:hidden">
            <Nav pathname={pathname} onNavigate={navigateFromMenu} />
          </div>
          <main id="frontier-main" ref={main} tabIndex={-1} className="min-w-0 flex-1">
            {ready ? children : <Boot />}
            <noscript>
              <style>{".frontier-boot,.frontier-menu-toggle{display:none!important}"}</style>
              <section className="frontier-static">
                <p className="frontier-kicker">SZL Frontier · source access</p>
                <h1>Explore the Frontier source</h1>
                <p>The interactive workspaces require JavaScript to load their browser-local memory and controls. Source identity and documentation remain available here. Production effects remain HOLD.</p>
                <SourceLinks />
              </section>
            </noscript>
          </main>
          <footer className="frontier-footer">
            <p>Frontier software plane <span aria-hidden="true">·</span> production HOLD</p>
            <SourceLinks />
          </footer>
        </div>
      </div>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className={cn("frontier-brand flex min-w-0 items-center gap-3", !compact && "px-5 py-5")} aria-label="SZL Frontier home">
      <SzlMark className="size-10 shrink-0" />
      <div>
        <div className="frontier-brand-parent">SZL Holdings</div>
        <div className="frontier-brand-name">Frontier</div>
      </div>
    </Link>
  );
}

function Nav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Frontier workspaces" className="frontier-nav flex flex-col gap-1 px-3">
      {NAV.map((item) => {
        const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors",
              active ? "bg-bg-raised text-fg" : "text-muted hover:bg-bg-subtle hover:text-fg",
            )}
          >
            <Icon className="size-4 shrink-0" strokeWidth={1.6} aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function PlaneStatus() {
  const memories = useOrchestrator((s) => s.memories.length);
  const receipts = useOrchestrator((s) => s.receipts.length);
  const brainN = useOrchestrator((s) => s.brainCorpusN);
  const ready = useOrchestrator((s) => s.brainReady);
  const alive = useOrchestrator((s) => s.brainAlive);
  const error = useOrchestrator((s) => s.brainError);
  const organPaint = useOrchestrator((s) => s.organPaint);
  const organCycle = useOrchestrator((s) => s.organCycle);
  const brainStatus = brainStatusPresentation({ ready, alive, error });
  const brainChip =
    brainStatus.tone === "allow"
      ? "bg-allow"
      : brainStatus.tone === "pending"
        ? "bg-pending"
        : "bg-subtle";
  const tone = paintTone(organPaint);
  const chip =
    tone === "allow" ? "bg-allow" : tone === "deny" ? "bg-deny" : "bg-pending";
  return (
    <div className="frontier-plane-status mt-auto border-t border-border px-5 py-4">
      <p className="mb-3 text-xs font-medium text-subtle">This browser session</p>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted"
      >
        <span className={`size-1.5 shrink-0 rounded-full ${brainChip}`} aria-hidden="true" />
        {brainStatus.label} · {brainStatus.evidence}
      </div>
      <div className="mt-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted">
        <span className={`size-1.5 shrink-0 rounded-full ${chip}`} aria-hidden="true" />
        Λ {paintLabel(organPaint, organCycle?.verdict)}
      </div>
      <div className="mt-3 space-y-1 font-mono text-[11px] text-subtle tabular">
        <div>mem {memories}</div>
        <div>rcpt {receipts}</div>
        <div>brain {ready ? brainN : "—"}</div>
        <div>deny-by-default</div>
        <div>prod HOLD</div>
        <div>conjecture 1</div>
      </div>
    </div>
  );
}

function Boot() {
  return (
    <div className="frontier-boot flex min-h-[60vh] items-center justify-center px-5">
      <div className="max-w-sm text-center">
        <SzlMark className="mx-auto size-10" />
        <p role="status" className="mt-4 text-sm tracking-[0.12em] text-muted">Initializing the software plane</p>
        <p className="mt-3 text-sm text-subtle">Loading this browser&apos;s memory and controls. Production effects remain HOLD.</p>
      </div>
    </div>
  );
}

function SourceLinks() {
  return (
    <nav aria-label="Source and ecosystem" className="frontier-source-links">
      <a href="/api/source">Source identity</a>
      <a href="https://github.com/szl-holdings/szl-frontier">Repository</a>
      <a href="https://a-11-oy.com">A11oy product</a>
      <a href="https://a11oy.net">Proof portal</a>
    </nav>
  );
}
