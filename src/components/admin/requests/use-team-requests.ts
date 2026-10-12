"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const TEAM_REQUEST_KEYS = {
  budget: ["team-requests", "budget"],
  pendingAdvances: ["team-requests", "advances-pending"],
  pendingLeaves: ["team-requests", "leaves-pending"],
  employees: ["team-requests", "employees"],
  decidedAdvances: ["team-requests", "advances-decided"],
} as const;

/** Everything waiting for the owner's decision, plus the budget those decisions draw on. */
export function useTeamRequests(enabled = true) {
  const budget = useQuery({
    queryKey: TEAM_REQUEST_KEYS.budget,
    queryFn: () => api.getAdvanceBudget(),
    enabled,
  });
  const advances = useQuery({
    queryKey: TEAM_REQUEST_KEYS.pendingAdvances,
    queryFn: () => api.getAdvances({ status: "PENDING", size: 100 }),
    enabled,
  });
  const leaves = useQuery({
    queryKey: TEAM_REQUEST_KEYS.pendingLeaves,
    queryFn: () => api.getPendingLeaves(),
    enabled,
  });

  const pendingAdvances = advances.data?.content ?? [];
  const pendingLeaves = leaves.data ?? [];
  return {
    budget: budget.data,
    pendingAdvances,
    pendingLeaves,
    pendingTotal: pendingAdvances.length + pendingLeaves.length,
    loading: budget.isLoading || advances.isLoading || leaves.isLoading,
    error: budget.error ?? advances.error ?? leaves.error,
  };
}
