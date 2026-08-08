"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import {
  salesApi,
  LeadStage,
  LeadType,
  SalesLead,
  SalesLocality,
} from "@/modules/sales/api/salesApi";
import {
  PIPELINE_STAGES,
  STAGE_LABELS,
  isTerminalStage,
} from "@/modules/sales/lib/stage-utils";
import {
  EMPTY_FILTERS,
} from "@/modules/sales/components/SalesLeadFilters";
import { SalesPipelineToolbar } from "@/modules/sales/components/SalesPipelineToolbar";
import { SalesPipelineSummaryWidgets } from "@/modules/sales/components/SalesPipelineSummaryWidgets";
import { SalesLeadsListSection } from "@/modules/sales/components/SalesLeadsListSection";
import { useSalesPipelineParams } from "@/modules/sales/hooks/useSalesPipelineParams";
import { buildLeadListParams } from "@/modules/sales/lib/pipeline-search-params";
import { salesLeadDetailHref } from "@/modules/sales/lib/lead-routes";
import { UseCaseMultiSelect } from "@/modules/sales/components/UseCaseMultiSelect";
import {
  formatUseCases,
  mergeNotesWithCustomUseCases,
  PREDEFINED_USE_CASES,
} from "@/modules/sales/lib/use-cases";
import { formatDateRangeLabel } from "@/modules/sales/lib/date-range";
import {
  invalidateSalesLeadLists,
  salesQueryKeys,
} from "@/modules/sales/lib/query-keys";
import { useAutoCompleteInfiniteList } from "@/lib/use-auto-complete-infinite-list";
import { useInfinitePagedList } from "@/lib/use-infinite-paged-list";
import { DEFAULT_PAGE_SIZE, InfiniteScrollFooter, PageHeader, Card, AlertBanner, SideSheet, inputClass, selectClass, btnPrimary, btnSecondary, EmptyState } from "@/components/ui";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3 border-b border-[var(--border)] pb-2">
      <h2 className="text-base font-semibold">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{subtitle}</p>}
    </div>
  );
}

function stageColumnClass(stage: LeadStage): string {
  if (stage === "WON") return "border-emerald-200 bg-emerald-50/30";
  if (stage === "LOST") return "border-red-200 bg-red-50/30";
  return "border-[var(--border)] bg-[var(--surface)]";
}

export default function SalesPipelinePage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "PLATFORM_SUPER_ADMIN";
  const { dateRange, filters, selectedRepIds, setDateRange, setFilters, setSelectedRepIds } =
    useSalesPipelineParams();
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileBoardStage, setMobileBoardStage] = useState<LeadStage>(PIPELINE_STAGES[0]);
  const [selectedUseCases, setSelectedUseCases] = useState<string[]>([]);
  const [customUseCases, setCustomUseCases] = useState("");
  const [form, setForm] = useState({
    businessName: "",
    contactName: "",
    phone: "",
    email: "",
    leadType: "SHOP" as LeadType,
    localityId: "",
    localityName: "",
    expectedBranches: 1,
    notes: "",
  });

  const repIdsForQuery = isAdmin ? selectedRepIds : [];

  const boardParams = useMemo(
    () => buildLeadListParams(EMPTY_FILTERS, dateRange, repIdsForQuery),
    [dateRange, repIdsForQuery]
  );
  const listParams = useMemo(
    () => buildLeadListParams(filters, dateRange, repIdsForQuery),
    [filters, dateRange, repIdsForQuery]
  );

  const {
    items: boardLeads,
    isLoading: boardLoading,
    isFetchingNextPage: boardFetchingNext,
  } = useAutoCompleteInfiniteList<SalesLead>({
    queryKey: [...salesQueryKeys.leadsBoard(boardParams)],
    queryFn: (page) => salesApi.listLeads(buildLeadListParams(EMPTY_FILTERS, dateRange, repIdsForQuery, page)),
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const {
    items: listLeads,
    totalElements: listTotalElements,
    hasMore: listHasMore,
    isLoading: listLoading,
    isFetchingNextPage: listFetchingNext,
    fetchNextPage: fetchNextListPage,
  } = useInfinitePagedList<SalesLead>({
    queryKey: [...salesQueryKeys.leadsList(listParams)],
    queryFn: (page) => salesApi.listLeads(buildLeadListParams(filters, dateRange, repIdsForQuery, page)),
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const { data: localities = [] } = useQuery({
    queryKey: ["sales-localities"],
    queryFn: () => salesApi.listLocalities(),
  });

  const { data: useCaseOptions = PREDEFINED_USE_CASES as unknown as string[] } = useQuery({
    queryKey: ["sales-use-cases"],
    queryFn: () => salesApi.listUseCases(),
  });

  const { data: reps = [] } = useQuery({
    queryKey: ["sales-reps"],
    queryFn: () => salesApi.listReps(),
    enabled: isAdmin,
  });

  const { data: summary } = useQuery({
    queryKey: salesQueryKeys.pipelineSummary(dateRange.from, dateRange.to, repIdsForQuery),
    queryFn: () =>
      salesApi.pipelineSummary({
        from: dateRange.from,
        to: dateRange.to,
        assignedRepIds: repIdsForQuery.length > 0 ? repIdsForQuery : undefined,
      }),
  });

  const boardLeadsForStage = boardLeads;
  const listLeadsForView = listLeads;

  const byStage = useMemo(() => {
    const map: Record<LeadStage, SalesLead[]> = Object.fromEntries(
      PIPELINE_STAGES.map((s) => [s, [] as SalesLead[]])
    ) as Record<LeadStage, SalesLead[]>;
    for (const lead of boardLeadsForStage) {
      if (map[lead.stage]) map[lead.stage].push(lead);
    }
    return map;
  }, [boardLeadsForStage]);

  const resetForm = () => {
    setForm({
      businessName: "",
      contactName: "",
      phone: "",
      email: "",
      leadType: "SHOP",
      localityId: "",
      localityName: "",
      expectedBranches: 1,
      notes: "",
    });
    setSelectedUseCases([]);
    setCustomUseCases("");
  };

  const createMutation = useMutation({
    mutationFn: () =>
      salesApi.createLead({
        ...form,
        useCase: formatUseCases(selectedUseCases),
        notes: mergeNotesWithCustomUseCases(form.notes, customUseCases),
        localityId: form.localityId || undefined,
        localityName:
          localities.find((l) => l.id === form.localityId)?.name || form.localityName,
      }),
    onSuccess: async () => {
      await invalidateSalesLeadLists(queryClient);
      await queryClient.invalidateQueries({
        queryKey: [...salesQueryKeys.pipelineSummary(dateRange.from, dateRange.to, repIdsForQuery)],
      });
      setDrawerOpen(false);
      resetForm();
    },
    onError: (e: Error) => setError(e.message),
  });

  const periodLabel = formatDateRangeLabel(dateRange.from, dateRange.to);
  const repScopeLabel =
    isAdmin && selectedRepIds.length > 0
      ? reps
          .filter((r) => selectedRepIds.includes(r.id))
          .map((r) => r.name.split(" ")[0])
          .join(", ")
      : isAdmin
        ? "All reps"
        : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAdmin ? "Sales Pipeline" : "My Pipeline"}
        subtitle={
          isAdmin
            ? "All reps — Bangalore field sales"
            : `Hi ${user?.name?.split(" ")[0] ?? "there"} — tap a lead to see your next step`
        }
        action={
          <button type="button" className={btnPrimary} onClick={() => setDrawerOpen(true)}>
            <Plus className="mr-2 inline h-4 w-4" />
            Add lead
          </button>
        }
      />

      <SalesPipelineToolbar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        showRepFilter={isAdmin}
        reps={reps}
        selectedRepIds={selectedRepIds}
        onRepIdsChange={setSelectedRepIds}
      />

      {summary && (
        <SalesPipelineSummaryWidgets
          summary={summary}
          periodLabel={periodLabel}
          repLabel={repScopeLabel}
        />
      )}

      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      {/* Board section — date range only, no column filters */}
      <section data-testid="pipeline-board-section">
        <SectionHeader
          title="Board view"
          subtitle={`Kanban by stage · ${periodLabel}`}
        />
        {boardLoading ? (
          <Card className="p-8 text-center text-sm text-[var(--ink-muted)]">Loading board…</Card>
        ) : boardLeads.length === 0 ? (
          <EmptyState
            title="No leads in this period"
            description="Add a shop from your field visit or expand the date range."
            action={
              <button type="button" className={btnPrimary} onClick={() => setDrawerOpen(true)}>
                Add lead
              </button>
            }
          />
        ) : (
          <>
            {/* Mobile: one stage at a time */}
            <div className="md:hidden space-y-3">
              <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain max-w-full min-w-0 no-scrollbar pb-1">
                {PIPELINE_STAGES.map((stage) => (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => setMobileBoardStage(stage)}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-2 text-xs font-semibold border touch-manipulation min-h-[40px]",
                      mobileBoardStage === stage
                        ? "bg-[var(--brand)] text-[var(--brand-on-brand)] border-[var(--brand)]"
                        : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)]"
                    )}
                  >
                    {STAGE_LABELS[stage]} ({byStage[stage].length})
                  </button>
                ))}
              </div>
              <div className={cn("rounded-xl border p-2 space-y-2", stageColumnClass(mobileBoardStage))}>
                {byStage[mobileBoardStage].map((lead) => (
                  <Link
                    key={lead.id}
                    href={salesLeadDetailHref(lead.id)}
                    className="block rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 touch-manipulation"
                  >
                    <p className="text-sm font-semibold">{lead.businessName}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {lead.contactName} · {lead.phone}
                    </p>
                    {lead.localityName && (
                      <p className="mt-1 text-xs text-[var(--brand-text)]">{lead.localityName}</p>
                    )}
                  </Link>
                ))}
                {byStage[mobileBoardStage].length === 0 && (
                  <p className="px-2 py-8 text-center text-xs text-[var(--text-tertiary)]">No leads in this stage</p>
                )}
              </div>
            </div>

            {/* Desktop / tablet: horizontal kanban */}
            <div className="hidden md:flex gap-3 overflow-x-auto overscroll-x-contain max-w-full min-w-0 pb-4">
            {PIPELINE_STAGES.map((stage) => (
              <div
                key={stage}
                className={cn(
                  "min-w-[200px] max-w-[240px] shrink-0 rounded-xl border",
                  stageColumnClass(stage)
                )}
              >
                <div className="border-b border-[var(--border)] px-3 py-2">
                  <p
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wide",
                      stage === "WON" && "text-emerald-700",
                      stage === "LOST" && "text-red-700",
                      !isTerminalStage(stage) && "text-[var(--text-secondary)]"
                    )}
                  >
                    {STAGE_LABELS[stage]}
                  </p>
                  <p className="text-lg font-bold">{byStage[stage].length}</p>
                </div>
                <div className="max-h-[55vh] space-y-2 overflow-y-auto p-2">
                  {byStage[stage].map((lead) => (
                    <Link
                      key={lead.id}
                      href={salesLeadDetailHref(lead.id)}
                      className="block rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3 transition hover:border-[var(--brand-ring)] hover:shadow-sm"
                    >
                      <p className="text-sm font-semibold">{lead.businessName}</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {lead.contactName} · {lead.phone}
                      </p>
                      {lead.localityName && (
                        <p className="mt-1 text-xs text-[var(--brand-text)]">{lead.localityName}</p>
                      )}
                      {isAdmin && lead.assignedRepName && (
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">{lead.assignedRepName}</p>
                      )}
                      {!isTerminalStage(stage) && (
                        <p className="mt-2 text-[10px] font-medium text-[var(--brand-text)]">
                          Open for next step →
                        </p>
                      )}
                    </Link>
                  ))}
                  {byStage[stage].length === 0 && (
                    <p className="px-2 py-4 text-center text-xs text-[var(--text-tertiary)]">Empty</p>
                  )}
                </div>
              </div>
            ))}
            </div>
          </>
        )}
      </section>

      <SalesLeadsListSection
        leads={listLeads}
        filters={filters}
        onFiltersChange={setFilters}
        localities={localities}
        isLoading={listLoading}
        periodLabel={periodLabel}
        boardLeadCount={boardLeads.length}
        infiniteScroll={{
          totalElements: listTotalElements,
          hasMore: listHasMore,
          isFetchingNextPage: listFetchingNext,
          onLoadMore: () => void fetchNextListPage(),
        }}
      />

      <SideSheet
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Add lead"
        subtitle="Capture a shop or brand from your field visit"
        footer={
          <>
            <button type="button" className={btnSecondary} onClick={() => setDrawerOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className={btnPrimary}
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Saving…" : "Save lead"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-sm">
            Business name *
            <input
              required
              className={inputClass}
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            Contact name *
            <input
              required
              className={inputClass}
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            Phone *
            <input
              required
              className={inputClass}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            Email
            <input
              className={inputClass}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            Lead type
            <select
              className={selectClass}
              value={form.leadType}
              onChange={(e) => setForm({ ...form, leadType: e.target.value as LeadType })}
            >
              <option value="SHOP">Shop (single location)</option>
              <option value="BRAND">Brand (multi-location)</option>
            </select>
          </label>
          <label className="block text-sm">
            Locality
            <select
              className={selectClass}
              value={form.localityId}
              onChange={(e) => setForm({ ...form, localityId: e.target.value })}
            >
              <option value="">Select area</option>
              {localities.map((l: SalesLocality) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.zone})
                </option>
              ))}
            </select>
          </label>
          <div className="block text-sm">
            <span className="mb-1.5 block">Use cases</span>
            <UseCaseMultiSelect
              options={useCaseOptions}
              selected={selectedUseCases}
              onChange={setSelectedUseCases}
            />
          </div>
          <label className="block text-sm">
            Other use cases (not in list)
            <textarea
              className={inputClass}
              rows={2}
              placeholder="e.g. GST filing, franchise onboarding — saved in notes"
              value={customUseCases}
              onChange={(e) => setCustomUseCases(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Notes
            <textarea
              className={inputClass}
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
        </div>
      </SideSheet>
    </div>
  );
}
