import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
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
import { useEffect, useState } from "react";
import { SzlMark } from "@/components/mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOrchestrator } from "@/stores/orchestrator";

const NAV = [
  { to: "/", label: "Command", icon: LayoutGrid },
  { to: "/memory", label: "Memory", icon: Database },
  { to: "/ingest", label: "Ingest", icon: FileInput },
  { to: "/models", label: "Models", icon: Cpu },
  { to: "/intel", label: "Intel", icon: Globe },
  { to: "/actions", label: "Actions", icon: Radio },
  { to: "/adversary", label: "Adversary", icon: ShieldAlert },
  { to: "/frontier", label: "Frontier", icon: Compass },
  { to: "/mesh", label: "Mesh", icon: Network },
  { to: "/proof", label: "Proof", icon: Link2 },
  { to: "/gates", label: "Gates", icon: ShieldCheck },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hydrate = useOrchestrator((s) => s.hydrate);
  const ready = useOrchestrator((s) => s.ready);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void hydrate();
    return useOrchestrator.persist.onFinishHydration(() => {
      void hydrate();
    });
  }, [hydrate]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <div className="flex min-h-dvh">
        <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-border bg-bg-elevated md:flex">
          <Brand />
          <div className="min-h-0 flex-1 overflow-y-auto pb-2">
            <Nav pathname={pathname} />
          </div>
          <PlaneStatus />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-bg/90 px-4 backdrop-blur-sm md:hidden">
            <div className="flex items-center gap-2.5 text-fg">
              <SzlMark className="size-6" />
              <span className="text-sm font-medium tracking-[0.18em]">SZL FRONTIER</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X /> : <Menu />}
            </Button>
          </header>
          {open ? (
            <div className="border-b border-border bg-bg-elevated px-3 py-3 md:hidden">
              <Nav pathname={pathname} />
            </div>
          ) : null}
          <main className="min-w-0 flex-1">{ready ? children : <Boot />}</main>
        </div>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-5 py-6">
      <SzlMark className="size-7 text-accent" />
      <div>
        <div className="text-[11px] font-medium tracking-[0.28em] text-muted">SZL</div>
        <div className="text-sm font-medium tracking-[0.16em]">FRONTIER</div>
      </div>
    </div>
  );
}

function Nav({ pathname }: { pathname: string }) {
  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {NAV.map((item) => {
        const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors",
              active ? "bg-bg-subtle text-fg" : "text-muted hover:bg-bg-subtle hover:text-fg",
            )}
          >
            <Icon className="size-4" strokeWidth={1.6} />
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
  return (
    <div className="mt-auto border-t border-border px-5 py-5">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted">
        <span className="size-1.5 rounded-full bg-allow" />
        Covenant live
      </div>
      <div className="mt-3 space-y-1 font-mono text-[11px] text-subtle tabular">
        <div>mem {memories}</div>
        <div>rcpt {receipts}</div>
        <div>deny-by-default</div>
      </div>
    </div>
  );
}

function Boot() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <SzlMark className="mx-auto size-8 text-accent" />
        <p className="mt-4 text-sm tracking-[0.18em] text-muted">INITIALIZING PLANE</p>
      </div>
    </div>
  );
}
