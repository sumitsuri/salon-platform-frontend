"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type AdminBranchSelectionMode = "all" | "pilot";

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

  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);

  useEffect(() => {
    if (branchesLoading || selectedBranches.length > 0 || branches.length === 0) return;
    if (mode === "pilot") {
      const pilot = branches.find((b) => b.code === "VAR") ?? branches[0];
      setSelectedBranches(pilot ? [pilot.id] : branches.map((b) => b.id));
    } else {
      setSelectedBranches(branches.map((b) => b.id));
    }
  }, [branches, branchesLoading, selectedBranches.length, mode]);

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
