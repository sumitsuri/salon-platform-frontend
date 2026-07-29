"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { salesApi, SalesRep, SalesTarget } from "@/modules/sales/api/salesApi";
import { SalesPipelineToolbar } from "@/modules/sales/components/SalesPipelineToolbar";
import { RepTargetProgressCard } from "@/modules/sales/components/RepTargetProgressCard";
import { useSalesPipelineParams } from "@/modules/sales/hooks/useSalesPipelineParams";
import { formatDateRangeLabel, weekStartFromIso } from "@/modules/sales/lib/date-range";
import {
  PageHeader,
  Card,
  AlertBanner,
  SideSheet,
  inputClass,
  btnPrimary,
  btnSecondary,
  EmptyState,
  ListRow,
} from "@/components/ui";
import { MissionStrip } from "@/components/brand/MissionStrip";

type RepFormState = { name: string; email: string; password: string; active: boolean };

const emptyRepForm = (): RepFormState => ({ name: "", email: "", password: "", active: true });

const DEFAULT_WEEKLY_TARGETS = {
  targetLeads: 10,
  targetVisits: 15,
  targetPitches: 8,
  targetTrials: 3,
  targetConversions: 1,
} as const;

export default function SalesTeamPage() {
  const queryClient = useQueryClient();
  const { dateRange, setDateRange } = useSalesPipelineParams();
  const periodLabel = formatDateRangeLabel(dateRange.from, dateRange.to);
  const targetWeek = weekStartFromIso(dateRange.to);

  const [error, setError] = useState("");
  const [repDrawer, setRepDrawer] = useState(false);
  const [editingRep, setEditingRep] = useState<SalesRep | null>(null);
  const [targetDrawer, setTargetDrawer] = useState(false);
  const [lockTargetRep, setLockTargetRep] = useState(false);
  const [repForm, setRepForm] = useState<RepFormState>(emptyRepForm());
  const [targetForm, setTargetForm] = useState<SalesTarget>({
    repId: "",
    weekStartDate: targetWeek,
    targetLeads: 10,
    targetVisits: 15,
    targetPitches: 8,
    targetTrials: 3,
    targetConversions: 1,
  });

  const { data: reps = [] } = useQuery({
    queryKey: ["sales-reps", "all"],
    queryFn: () => salesApi.listReps(true),
  });

  const activeReps = useMemo(() => reps.filter((r) => r.active), [reps]);

  const { data: targets = [] } = useQuery({
    queryKey: ["sales-targets", targetWeek, dateRange.from, dateRange.to],
    queryFn: () =>
      salesApi.listTargets(targetWeek, { from: dateRange.from, to: dateRange.to }),
  });

  const { data: performance = [], isLoading: perfLoading } = useQuery({
    queryKey: ["sales-rep-performance", dateRange.from, dateRange.to, targetWeek],
    queryFn: () =>
      salesApi.repAnalytics({
        from: dateRange.from,
        to: dateRange.to,
        weekStart: targetWeek,
      }),
  });

  const repTargetViews = useMemo(() => {
    return activeReps.map((rep) => {
      const saved = targets.find((t) => t.repId === rep.id);
      const perf = performance.find((p) => p.repId === rep.id);
      return {
        repId: rep.id,
        repName: rep.name,
        weekStartDate: targetWeek,
        id: saved?.id,
        ...DEFAULT_WEEKLY_TARGETS,
        ...saved,
        actualLeads: saved?.actualLeads ?? perf?.leadsAdded ?? 0,
        actualVisits: saved?.actualVisits ?? perf?.visits ?? 0,
        actualPitches: saved?.actualPitches ?? perf?.pitches ?? 0,
        actualTrials: saved?.actualTrials ?? perf?.trials ?? 0,
        actualConversions: saved?.actualConversions ?? perf?.conversions ?? 0,
        hasSavedTarget: !!saved,
      };
    });
  }, [activeReps, targets, performance, targetWeek]);

  const targetByRepId = useMemo(() => {
    const map = new Map<string, (typeof repTargetViews)[0]>();
    for (const view of repTargetViews) map.set(view.repId, view);
    return map;
  }, [repTargetViews]);

  const invalidateTeam = () => {
    queryClient.invalidateQueries({ queryKey: ["sales-reps"] });
    queryClient.invalidateQueries({ queryKey: ["sales-targets"] });
    queryClient.invalidateQueries({ queryKey: ["sales-rep-performance"] });
  };

  const createRep = useMutation({
    mutationFn: () => salesApi.createRep(repForm),
    onSuccess: () => {
      invalidateTeam();
      closeRepDrawer();
    },
    onError: (e: Error) => setError(e.message),
  });

  const updateRep = useMutation({
    mutationFn: () => {
      if (!editingRep) throw new Error("No rep selected");
      const payload: Parameters<typeof salesApi.updateRep>[1] = {
        name: repForm.name,
        email: repForm.email,
        active: repForm.active,
      };
      if (repForm.password) payload.password = repForm.password;
      return salesApi.updateRep(editingRep.id, payload);
    },
    onSuccess: () => {
      invalidateTeam();
      closeRepDrawer();
    },
    onError: (e: Error) => setError(e.message),
  });

  const deactivateRep = useMutation({
    mutationFn: (id: string) => salesApi.deactivateRep(id),
    onSuccess: invalidateTeam,
    onError: (e: Error) => setError(e.message),
  });

  const upsertTarget = useMutation({
    mutationFn: () => salesApi.upsertTarget({ ...targetForm, weekStartDate: targetWeek }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-targets"] });
      queryClient.invalidateQueries({ queryKey: ["sales-rep-performance"] });
      setTargetDrawer(false);
    },
    onError: (e: Error) => setError(e.message),
  });

  const openAddRep = () => {
    setEditingRep(null);
    setRepForm(emptyRepForm());
    setRepDrawer(true);
  };

  const openEditRep = (rep: SalesRep) => {
    setEditingRep(rep);
    setRepForm({ name: rep.name, email: rep.email, password: "", active: rep.active });
    setRepDrawer(true);
  };

  const closeRepDrawer = () => {
    setRepDrawer(false);
    setEditingRep(null);
    setRepForm(emptyRepForm());
  };

  const handleDeactivate = (rep: SalesRep) => {
    if (
      !window.confirm(
        `Deactivate ${rep.name}? They will no longer receive new leads or appear in active lists.`
      )
    ) {
      return;
    }
    deactivateRep.mutate(rep.id);
  };

  const openSetTargets = (repId?: string) => {
    const saved = repId ? targets.find((t) => t.repId === repId) : undefined;
    setTargetForm({
      repId: repId ?? "",
      weekStartDate: targetWeek,
      ...DEFAULT_WEEKLY_TARGETS,
      ...saved,
    });
    setLockTargetRep(!!repId);
    setTargetDrawer(true);
  };

  const openEditTarget = (repId: string) => openSetTargets(repId);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sales Team"
        subtitle="Manage reps, weekly targets, and performance"
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button type="button" className={`${btnSecondary} w-full sm:w-auto`} onClick={() => openSetTargets()}>
              Set targets
            </button>
            <button type="button" className={`${btnPrimary} w-full sm:w-auto`} onClick={openAddRep}>
              <Plus className="mr-2 inline h-4 w-4" />
              Add rep
            </button>
          </div>
        }
      />

      <SalesPipelineToolbar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        dateTestId="team-date-range"
      />

      <MissionStrip />
      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      <Card className="p-4">
        <h3 className="mb-3 font-semibold">Sales executives</h3>
        {reps.length === 0 ? (
          <EmptyState title="No reps yet" description="Add sales executives to start assigning leads." />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {reps.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <span className="min-w-0">
                  <span className="block font-medium">{r.name}</span>
                  <span className="block truncate text-xs text-[var(--ink-muted)] sm:text-sm">
                    {r.email}
                  </span>
                </span>
                <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
                  <span className={r.active ? "text-emerald-600" : "text-red-600"}>
                    {r.active ? "Active" : "Inactive"}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded p-2 text-[var(--ink-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--brand-text)] touch-manipulation"
                      aria-label={`Edit ${r.name}`}
                      onClick={() => openEditRep(r)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {r.active && (
                      <button
                        type="button"
                        className="rounded p-2 text-[var(--ink-muted)] hover:bg-red-50 hover:text-red-600 touch-manipulation"
                        aria-label={`Deactivate ${r.name}`}
                        onClick={() => handleDeactivate(r)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold">Rep performance</h3>
          <span className="text-xs text-[var(--ink-muted)]">{periodLabel}</span>
        </div>
        {perfLoading ? (
          <p className="text-sm text-[var(--ink-muted)]">Loading performance…</p>
        ) : performance.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">No performance data for this period.</p>
        ) : (
          <>
            <div className="hidden md:block responsive-table-wrap">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--ink-muted)]">
                    <th className="py-2 pr-4">Rep</th>
                    <th className="py-2 pr-4">Leads</th>
                    <th className="py-2 pr-4">Visits</th>
                    <th className="py-2 pr-4">Pitches</th>
                    <th className="py-2 pr-4">Trials</th>
                    <th className="py-2 pr-4">Wins</th>
                    <th className="py-2 pr-4">Lost</th>
                    <th className="py-2 pr-4">Win target</th>
                    <th className="py-2 pr-4">Incentive</th>
                    <th className="py-2">Target %</th>
                  </tr>
                </thead>
                <tbody>
                  {performance.map((p) => (
                    <tr
                      key={p.repId}
                      className={`border-b border-[var(--border)] ${p.underperforming ? "bg-red-50/50" : ""}`}
                    >
                      <td className="py-2 pr-4 font-medium">{p.repName}</td>
                      <td className="py-2 pr-4 tabular-nums">{p.leadsAdded}</td>
                      <td className="py-2 pr-4 tabular-nums">{p.visits}</td>
                      <td className="py-2 pr-4 tabular-nums">{p.pitches}</td>
                      <td className="py-2 pr-4 tabular-nums">{p.trials}</td>
                      <td className="py-2 pr-4 tabular-nums text-emerald-700">{p.conversions}</td>
                      <td className="py-2 pr-4 tabular-nums text-red-600">{p.lost ?? 0}</td>
                      <td className="py-2 pr-4">
                        <button
                          type="button"
                          className="text-[var(--brand-text)] hover:underline touch-manipulation"
                          onClick={() => openEditTarget(p.repId)}
                        >
                          {targetByRepId.get(p.repId)?.targetConversions ?? "—"} wins
                        </button>
                      </td>
                      <td className="py-2 pr-4 tabular-nums">
                        ₹{Math.round(p.incentiveEarned).toLocaleString("en-IN")}
                      </td>
                      <td className="py-2 tabular-nums">{p.targetAchievementPercent.toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="-mx-4 divide-y divide-[var(--border)] md:hidden sm:-mx-5">
              {performance.map((p) => (
                <ListRow
                  key={p.repId}
                  title={p.repName}
                  subtitle={`${p.leadsAdded} leads · ${p.visits} visits · ${p.conversions} wins · ${p.lost ?? 0} lost`}
                  trailing={
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums">
                        ₹{Math.round(p.incentiveEarned).toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-[var(--ink-muted)] tabular-nums">
                        {p.targetAchievementPercent.toFixed(0)}% target
                      </p>
                    </div>
                  }
                />
              ))}
            </div>
          </>
        )}
        <p className="mt-2 text-xs text-[var(--ink-muted)]">
          Incentive reflects the week of {targetWeek}. Target % is based on wins vs weekly conversion
          target.
        </p>
      </Card>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold">Target progress</h3>
            <p className="text-xs text-[var(--ink-muted)]">
              Actuals for {periodLabel} vs weekly targets (week of {targetWeek})
            </p>
          </div>
          <button type="button" className={`${btnSecondary} w-full sm:w-auto`} onClick={() => openSetTargets()}>
            Set targets
          </button>
        </div>
        {activeReps.length === 0 ? (
          <Card className="p-6">
            <EmptyState title="No active reps" description="Add sales executives to set targets." />
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {repTargetViews.map((t) => (
              <RepTargetProgressCard
                key={t.repId}
                target={t}
                periodLabel={periodLabel}
                hasSavedTarget={t.hasSavedTarget}
                onEdit={() => openEditTarget(t.repId)}
              />
            ))}
          </div>
        )}
      </div>

      <SideSheet
        open={repDrawer}
        onClose={closeRepDrawer}
        title={editingRep ? "Edit sales rep" : "Add sales rep"}
        footer={
          <>
            <button type="button" className={btnSecondary} onClick={closeRepDrawer}>
              Cancel
            </button>
            <button
              type="button"
              className={btnPrimary}
              disabled={createRep.isPending || updateRep.isPending}
              onClick={() => (editingRep ? updateRep.mutate() : createRep.mutate())}
            >
              {editingRep ? "Save changes" : "Create"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <input
            className={inputClass}
            placeholder="Full name"
            value={repForm.name}
            onChange={(e) => setRepForm({ ...repForm, name: e.target.value })}
          />
          <input
            className={inputClass}
            placeholder="Email"
            value={repForm.email}
            onChange={(e) => setRepForm({ ...repForm, email: e.target.value })}
          />
          <input
            className={inputClass}
            type="password"
            placeholder={editingRep ? "New password (leave blank to keep)" : "Password"}
            value={repForm.password}
            onChange={(e) => setRepForm({ ...repForm, password: e.target.value })}
          />
          {editingRep && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={repForm.active}
                onChange={(e) => setRepForm({ ...repForm, active: e.target.checked })}
              />
              Active
            </label>
          )}
        </div>
      </SideSheet>

      <SideSheet
        open={targetDrawer}
        onClose={() => {
          setTargetDrawer(false);
          setLockTargetRep(false);
        }}
        title={`Set weekly targets · week of ${targetWeek}`}
        footer={
          <>
            <button type="button" className={btnSecondary} onClick={() => setTargetDrawer(false)}>
              Cancel
            </button>
            <button type="button" className={btnPrimary} onClick={() => upsertTarget.mutate()}>
              Save
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <select
            className={inputClass}
            value={targetForm.repId}
            onChange={(e) => setTargetForm({ ...targetForm, repId: e.target.value })}
            disabled={lockTargetRep}
          >
            <option value="">Select rep</option>
            {activeReps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          {(["targetLeads", "targetVisits", "targetPitches", "targetTrials", "targetConversions"] as const).map(
            (field) => (
              <label key={field} className="block text-sm capitalize">
                {field.replace("target", "Target ")}
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  value={targetForm[field]}
                  onChange={(e) =>
                    setTargetForm({ ...targetForm, [field]: parseInt(e.target.value, 10) || 0 })
                  }
                />
              </label>
            )
          )}
        </div>
      </SideSheet>
    </div>
  );
}
