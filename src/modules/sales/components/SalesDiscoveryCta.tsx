"use client";

import { useState } from "react";
import { ChevronRight, Sparkles } from "lucide-react";
import { SalesLocality, SalesRep } from "@/modules/sales/api/salesApi";
import { SalesLeadDiscoveryPanel } from "@/modules/sales/components/SalesLeadDiscoveryPanel";
import { cn } from "@/lib/utils";

type SalesDiscoveryCtaProps = {
  localities: SalesLocality[];
  isAdmin: boolean;
  reps: SalesRep[];
  defaultOpen?: boolean;
  onImported?: () => void;
};

export function SalesDiscoveryCta({ localities, isAdmin, reps, defaultOpen, onImported }: SalesDiscoveryCtaProps) {
  const [open, setOpen] = useState(!!defaultOpen);

  return (
    <section>
      <button
        type="button"
        className="sales-discovery-cta"
        onClick={() => setOpen((v) => !v)}
        data-testid="sales-discovery-cta"
      >
        <span className="sales-discovery-cta-glow" aria-hidden />
        <span className="sales-discovery-cta-icon" aria-hidden>
          <Sparkles className="h-5 w-5" />
        </span>
        <span className="sales-discovery-cta-body">
          <span className="sales-discovery-cta-title">Find your next lead</span>
          <span className="sales-discovery-cta-kicker">Salons near you, ready to claim</span>
        </span>
        <span className="sales-discovery-cta-pill">
          {open ? "Hide" : "Browse map"}
          <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
        </span>
      </button>

      {open && (
        <div className="mt-2">
          <SalesLeadDiscoveryPanel localities={localities} isAdmin={isAdmin} reps={reps} onImported={onImported} />
        </div>
      )}
    </section>
  );
}
