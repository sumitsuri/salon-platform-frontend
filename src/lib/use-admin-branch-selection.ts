"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { usePersistentState } from "@/lib/use-persistent-state";

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
 * Use `needsInitialFetch` only when there is no cached branch list yet.
 */
export function useAdminBranchSelection(mode: AdminBranchSelectionMode = "all") {
  const { data: branches = [], isLoading: branchesLoading, isError: branchesError } = useQuery({
    queryKey: ["branches"],
    queryFn: () => api.getBranches(),
    retry: 2,
    staleTime: 300_000,
  });

  const [selectedBranches, setSelectedBranches] = usePersistentState<string[]>(
    `admin-branch-selection:${mode}`,
    []
  );

  useEffect(() => {
    if (branchesLoading || branches.length === 0) return;

    const validIds = new Set(branches.map((b) => b.id));
    const pruned = selectedBranches.filter((id) => validIds.has(id));

    if (pruned.length !== selectedBranches.length) {
      setSelectedBranches(
        pruned.length > 0 ? pruned : mode === "pilot" ? defaultPilotBranchIds(branches) : branches.map((b) => b.id),
      );
      return;
    }

    if (selectedBranches.length === 0) {
      setSelectedBranches(
        mode === "pilot" ? defaultPilotBranchIds(branches) : branches.map((b) => b.id),
      );
    }
  }, [branches, branchesLoading, selectedBranches, mode, setSelectedBranches]);

  const branchIdsFilter =
    selectedBranches.length > 0 && selectedBranches.length < branches.length
      ? selectedBranches
      : undefined;

  const needsInitialFetch = branchesLoading && branches.length === 0;

  return {
    branches,
    branchesLoading,
    branchesError,
    selectedBranches,
    setSelectedBranches,
    branchIdsFilter,
    needsInitialFetch,
    branchesSelected: selectedBranches.length > 0,
  };
}
