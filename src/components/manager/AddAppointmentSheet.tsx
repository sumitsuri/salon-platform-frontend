"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Search, User } from "lucide-react";
import { api } from "@/lib/api";
import { isValidIndianMobile, normalizeIndianMobile } from "@/lib/phone";
import { formatCurrency, cn } from "@/lib/utils";
import { SideSheet, inputClass, selectClass, btnPrimary, AlertBanner } from "@/components/ui";

type LookupStatus = "idle" | "loading" | "found" | "not_found";

export type StaffOption = { id: string; name: string };

export function AddAppointmentSheet({
  open,
  onClose,
  branchId,
  staffId,
  staffName,
  staffOptions,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  branchId: string;
  staffId: string;
  staffName: string;
  staffOptions: StaffOption[];
  onCreated: () => void;
}) {
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState("");
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>("idle");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [newGuestName, setNewGuestName] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState(staffId);
  const [serviceSearch, setServiceSearch] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [error, setError] = useState("");

  const { data: branchServices = [] } = useQuery({
    queryKey: ["branch-services", branchId],
    queryFn: () => api.getBranchServices(branchId),
    enabled: open && !!branchId,
    staleTime: 300_000,
  });

  const filteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    const sorted = [...branchServices].sort((a, b) => a.serviceName.localeCompare(b.serviceName));
    if (!q) return sorted;
    return sorted.filter(
      (row) =>
        row.serviceName.toLowerCase().includes(q) || (row.categoryName || "").toLowerCase().includes(q)
    );
  }, [branchServices, serviceSearch]);

  const selectedServices = useMemo(
    () => branchServices.filter((row) => selectedServiceIds.includes(row.id)),
    [branchServices, selectedServiceIds]
  );

  const estimatedTotal = selectedServices.reduce((sum, row) => sum + (row.price || 0), 0);
  const estimatedMinutes = selectedServices.reduce((sum, row) => sum + (row.durationMinutes || 0), 0);

  function toggleService(key: string) {
    setSelectedServiceIds((prev) => (prev.includes(key) ? prev.filter((id) => id !== key) : [...prev, key]));
  }

  function runLookup() {
    const normalized = normalizeIndianMobile(phone);
    if (!normalized) return;
    setLookupStatus("loading");
    setError("");
    api
      .findCustomerByPhone(normalized, branchId)
      .then((c) => {
        setCustomerId(c.id);
        setCustomerName(c.name);
        setLookupStatus("found");
      })
      .catch(() => {
        setCustomerId("");
        setCustomerName("");
        setLookupStatus("not_found");
      });
  }

  function reset() {
    setPhone("");
    setLookupStatus("idle");
    setCustomerId("");
    setCustomerName("");
    setNewGuestName("");
    setSelectedStaffId(staffId);
    setServiceSearch("");
    setSelectedServiceIds([]);
    setError("");
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      let resolvedCustomerId = customerId;
      if (lookupStatus === "not_found") {
        const normalized = normalizeIndianMobile(phone);
        if (!newGuestName.trim()) throw new Error("Enter the customer's name");
        const created = await api.createCustomer({
          name: newGuestName.trim(),
          phone: normalized || undefined,
          branchId,
        });
        resolvedCustomerId = created.id;
      }
      if (!resolvedCustomerId) throw new Error("Look up or add a customer first");
      if (selectedServices.length === 0) throw new Error("Add at least one service");

      return api.createBooking({
        branchId,
        customerId: resolvedCustomerId,
        keepOpen: true,
        lines: selectedServices.map((row) => ({
          branchServiceId: row.id,
          staffId: selectedStaffId,
          quantity: 1,
          unitPrice: row.price,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branch-availability"] });
      reset();
      onCreated();
      onClose();
    },
    onError: (e: Error) => setError(e.message || "Couldn't create the booking"),
  });

  const canSubmit =
    (lookupStatus === "found" || (lookupStatus === "not_found" && newGuestName.trim().length > 0)) &&
    selectedServices.length > 0 &&
    !!selectedStaffId;

  const selectedStaffName = staffOptions.find((s) => s.id === selectedStaffId)?.name ?? staffName;

  return (
    <SideSheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="New appointment"
      subtitle={`Starts now · ${selectedStaffName}`}
      footer={
        <>
          {error && <p className="text-xs text-red-600">{error}</p>}
          {selectedServices.length > 0 && (
            <p className="text-xs text-[var(--text-secondary)]">
              {selectedServices.length} service{selectedServices.length === 1 ? "" : "s"} ·{" "}
              {formatCurrency(estimatedTotal)} · ~{estimatedMinutes}m
            </p>
          )}
          <button
            type="button"
            className={`${btnPrimary} w-full min-h-12 justify-center touch-manipulation`}
            disabled={!canSubmit || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? "Adding…" : "Add booking"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)]">Customer phone</label>
          <div className="mt-1 flex gap-2">
            <input
              className={`${inputClass} flex-1`}
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setLookupStatus("idle");
              }}
              onBlur={runLookup}
              inputMode="numeric"
            />
          </div>
          {lookupStatus === "loading" && (
            <p className="mt-1.5 text-xs text-[var(--text-secondary)]">Looking up…</p>
          )}
          {lookupStatus === "found" && (
            <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              <User className="h-3.5 w-3.5" /> {customerName}
            </p>
          )}
          {lookupStatus === "not_found" && (
            <div className="mt-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">New customer&apos;s name</label>
              <input
                className={`${inputClass} mt-1`}
                placeholder="Full name"
                value={newGuestName}
                onChange={(e) => setNewGuestName(e.target.value)}
              />
            </div>
          )}
          {phone && !isValidIndianMobile(phone) && (
            <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">Enter a valid 10-digit mobile number</p>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)]">Stylist</label>
          <select
            className={`${selectClass} mt-1`}
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
          >
            {staffOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)]">Services</label>
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              className={`${inputClass} pl-9`}
              placeholder="Search services"
              value={serviceSearch}
              onChange={(e) => setServiceSearch(e.target.value)}
            />
          </div>
          <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-[var(--border)]">
            {filteredServices.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-[var(--text-secondary)]">No services match</p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {filteredServices.map((row) => {
                  const checked = selectedServiceIds.includes(row.id);
                  return (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => toggleService(row.id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition touch-manipulation",
                          checked ? "bg-[var(--brand-light)]/50" : "hover:bg-[var(--surface-muted)]"
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-[var(--text-primary)]">
                            {row.serviceName}
                          </span>
                          <span className="block truncate text-xs text-[var(--text-secondary)]">
                            {formatCurrency(row.price)}
                            {row.durationMinutes ? ` · ${row.durationMinutes}m` : ""}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                            checked
                              ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                              : "border-[var(--border)]"
                          )}
                        >
                          {checked && <Check className="h-3.5 w-3.5" />}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <AlertBanner variant="info">
          {`This starts a walk-in visit for ${selectedStaffName} now. Scheduling for a future time isn't supported yet.`}
        </AlertBanner>
      </div>
    </SideSheet>
  );
}
