"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { usePersistentState } from "@/lib/use-persistent-state";
import { getTodayRange } from "@/lib/date-range";
import {
  type AdminReportingRange,
  branchOverlapsReportingRange,
} from "@/lib/branch-reporting";

export type AdminBranchSelectionMode = "all" | "pilot";

/** Branch codes used for Local Spotlight Google pilot (demo-brand VAR, Mystic prod MW01). */
export const LOCAL_SPOTLIGHT_PILOT_BRANCH_CODES = ["MW01", "VAR"] as const;

function defaultPilotBranchIds(branches: { id: string; code: string }[]): string[] {
  const pilot = branches.find((b) =>
    (LOCAL_SPOTLIGHT_PILOT_BRANCH_CODES as readonly string[]).includes(b.code),
  );
  if (pilot) return [pilot.id];
  return branches.length > 0 ? [branches[0].id] : [];
}

/**
 * Loads branches and selects defaults once — without blocking page shell render.
 * `reportingRange` controls which branches appear in scope filters (soft-deactivated branches drop out
 * for current periods but remain for historical ranges). Organization → Branches lists all branches separately.
 */
export function useAdminBranchSelection(
  mode: AdminBranchSelectionMode = "all",
  reportingRange?: AdminReportingRange | null,
) {
  const { data: branches = [], isLoading: branchesLoading, isError: branchesError } = useQuery({
    queryKey: ["branches"],
    queryFn: () => api.getBranches(),
    retry: 2,
    staleTime: 300_000,
  });

  const effectiveRange = reportingRange ?? getTodayRange();

  const reportingBranches = useMemo(() => {
    const scoped = branches.filter((b) =>
      branchOverlapsReportingRange(b, effectiveRange.from, effectiveRange.to),
    );
    if (mode === "pilot") {
      const pilots = scoped.filter((b) =>
        (LOCAL_SPOTLIGHT_PILOT_BRANCH_CODES as readonly string[]).includes(b.code),
      );
      return pilots.length > 0 ? pilots : scoped;
    }
    return scoped;
  }, [branches, effectiveRange.from, effectiveRange.to, mode]);

  const [selectedBranches, setSelectedBranches] = usePersistentState<string[]>(
    `admin-branch-selection:${mode}`,
    [],
  );

  useEffect(() => {
    if (branchesLoading || reportingBranches.length === 0) return;

    const validIds = new Set(reportingBranches.map((b) => b.id));
    const pruned = selectedBranches.filter((id) => validIds.has(id));

    if (pruned.length !== selectedBranches.length) {
      setSelectedBranches(
        pruned.length > 0
          ? pruned
          : mode === "pilot"
            ? defaultPilotBranchIds(reportingBranches)
            : reportingBranches.map((b) => b.id),
      );
      return;
    }

    if (selectedBranches.length === 0) {
      setSelectedBranches(
        mode === "pilot"
          ? defaultPilotBranchIds(reportingBranches)
          : reportingBranches.map((b) => b.id),
      );
    }
  }, [reportingBranches, branchesLoading, selectedBranches, mode, setSelectedBranches]);

  const branchIdsFilter =
    selectedBranches.length > 0 && selectedBranches.length < reportingBranches.length
      ? selectedBranches
      : undefined;

  const needsInitialFetch = branchesLoading && branches.length === 0;

  return {
    /** Branches in scope for the current reporting range (excludes soft-deactivated when appropriate). */
    branches: reportingBranches,
    /** Full tenant branch list including inactive (rare — prefer dedicated org queries). */
    allBranches: branches,
    branchesLoading,
    branchesError,
    selectedBranches,
    setSelectedBranches,
    branchIdsFilter,
    needsInitialFetch,
    branchesSelected: selectedBranches.length > 0,
    reportingRange: effectiveRange,
  };
}
