/** Shared React Query keys for sales module — use prefix `sales-leads` so invalidation refetches all lists. */
export const salesQueryKeys = {
  leadsRoot: ["sales-leads"] as const,
  leadsBoard: (params: Record<string, string | number | string[]>) =>
    ["sales-leads", "board", params] as const,
  leadsList: (params: Record<string, string | number | string[]>) =>
    ["sales-leads", "list", params] as const,
  leadsProgress: (from: string, to: string, repIds: string[]) =>
    ["sales-leads", "progress", from, to, repIds.join(",")] as const,
  lead: (id: string) => ["sales-lead", id] as const,
  myAnalytics: (from: string, to: string) => ["sales-my-analytics", from, to] as const,
  pipelineAnalytics: ["sales-pipeline-analytics"] as const,
  pipelineSummary: (from: string, to: string, repIds: string[]) =>
    ["sales-pipeline-summary", from, to, repIds.join(",")] as const,
};

export function invalidateSalesLeadLists(
  queryClient: { invalidateQueries: (opts: { queryKey: readonly string[] }) => Promise<void> }
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: [...salesQueryKeys.leadsRoot] }),
    queryClient.invalidateQueries({ queryKey: [...salesQueryKeys.pipelineAnalytics] }),
    queryClient.invalidateQueries({ queryKey: ["sales-pipeline-summary"] }),
  ]);
}
