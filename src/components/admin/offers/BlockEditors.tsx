"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Gift, PackageOpen, Percent, Plus, Trash2, X } from "lucide-react";
import { api, type CatalogServiceItem } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { btnSecondarySm, inputClass } from "@/components/ui";
import { newKey, newTier, packageTotals, type BlockDraft, type ItemDraft, type TierDraft } from "./offer-form";

const BLOCK_ICON = { SPEND_PERCENT: Percent, FREE_WITH_SPEND: Gift, PACKAGE: PackageOpen } as const;

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">{children}</label>;
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 transition touch-manipulation"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

function TierRow({
  block,
  tier,
  onChange,
  onRemove,
  canRemove,
  serviceNames,
}: {
  block: BlockDraft;
  tier: TierDraft;
  onChange: (t: TierDraft) => void;
  onRemove: () => void;
  canRemove: boolean;
  serviceNames: string[];
}) {
  const t = useTranslations("admin.offerStudio");
  const listId = `free-items-${tier.key}`;
  return (
    <div className="flex items-end gap-2">
      <div className="w-28 shrink-0">
        <Label>{t("tier")}</Label>
        <input
          inputMode="numeric"
          className={inputClass}
          value={tier.minSpend}
          placeholder="999"
          onChange={(e) => onChange({ ...tier, minSpend: e.target.value.replace(/[^0-9.]/g, "") })}
        />
      </div>
      {block.type === "SPEND_PERCENT" ? (
        <div className="w-28 shrink-0">
          <Label>{t("percentOff")}</Label>
          <input
            inputMode="decimal"
            className={inputClass}
            value={tier.percentOff}
            placeholder="10"
            onChange={(e) => onChange({ ...tier, percentOff: e.target.value.replace(/[^0-9.]/g, "") })}
          />
        </div>
      ) : (
        <div className="min-w-0 flex-1">
          <Label>{t("freeItem")}</Label>
          <input
            className={inputClass}
            list={listId}
            value={tier.freeItem}
            maxLength={80}
            placeholder={t("freeItemPlaceholder")}
            onChange={(e) => onChange({ ...tier, freeItem: e.target.value })}
          />
          <datalist id={listId}>
            {serviceNames.slice(0, 80).map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>
      )}
      {canRemove ? <RemoveButton label={t("removeTier")} onClick={onRemove} /> : <span className="h-10 w-10 shrink-0" />}
    </div>
  );
}

function ServicePicker({
  services,
  taken,
  onPick,
}: {
  services: CatalogServiceItem[];
  taken: Set<string>;
  onPick: (s: CatalogServiceItem) => void;
}) {
  const t = useTranslations("admin.offerStudio");
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return services
      .filter((s) => s.active && !taken.has(s.id) && s.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, services, taken]);

  return (
    <div className="relative">
      <input
        className={inputClass}
        value={query}
        placeholder={t("searchServices")}
        onChange={(e) => setQuery(e.target.value)}
      />
      {matches.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
          {matches.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm hover:bg-[var(--surface-muted)] touch-manipulation"
                onClick={() => {
                  onPick(s);
                  setQuery("");
                }}
              >
                <span className="min-w-0 truncate text-[var(--text-primary)]">{s.name}</span>
                <span className="shrink-0 text-xs text-[var(--text-secondary)]">
                  {s.listPrice ? formatCurrency(s.listPrice) : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function BlockEditor({
  block,
  index,
  onChange,
  onRemove,
}: {
  block: BlockDraft;
  index: number;
  onChange: (b: BlockDraft) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("admin.offerStudio");
  const Icon = BLOCK_ICON[block.type];
  const heading =
    block.type === "SPEND_PERCENT" ? t("addSpend") : block.type === "FREE_WITH_SPEND" ? t("addFree") : t("addPackage");

  const { data: services = [] } = useQuery({
    queryKey: ["catalog-services"],
    queryFn: () => api.getCatalogServices(),
    staleTime: 5 * 60_000,
  });
  // The catalogue repeats names across categories; suggestions must be unique (they are also React keys).
  const serviceNames = useMemo(() => Array.from(new Set(services.filter((s) => s.active).map((s) => s.name))), [services]);
  const takenIds = useMemo(() => new Set(block.items.map((i) => i.serviceId).filter(Boolean) as string[]), [block.items]);
  const totals = block.type === "PACKAGE" ? packageTotals(block) : null;

  const setTier = (key: string, next: TierDraft) =>
    onChange({ ...block, tiers: block.tiers.map((x) => (x.key === key ? next : x)) });
  const setItem = (key: string, next: ItemDraft) =>
    onChange({ ...block, items: block.items.map((x) => (x.key === key ? next : x)) });

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3 shadow-sm" data-testid="offer-block">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-light)] text-[var(--brand-text)]">
            <Icon className="h-4 w-4" />
          </span>
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {index + 1}. {heading}
          </p>
        </div>
        <RemoveButton label={t("removeOffer")} onClick={onRemove} />
      </div>

      {block.type !== "PACKAGE" && (
        <>
          <div>
            <Label>{t("appliesTo")}</Label>
            <input
              className={inputClass}
              value={block.appliesTo}
              maxLength={60}
              placeholder={t("appliesToPlaceholder")}
              onChange={(e) => onChange({ ...block, appliesTo: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            {block.tiers.map((tier) => (
              <TierRow
                key={tier.key}
                block={block}
                tier={tier}
                serviceNames={serviceNames}
                canRemove={block.tiers.length > 1}
                onChange={(next) => setTier(tier.key, next)}
                onRemove={() => onChange({ ...block, tiers: block.tiers.filter((x) => x.key !== tier.key) })}
              />
            ))}
          </div>
          {block.tiers.length < 5 && (
            <button
              type="button"
              className={btnSecondarySm}
              onClick={() => onChange({ ...block, tiers: [...block.tiers, newTier()] })}
            >
              <Plus className="h-3.5 w-3.5" />
              {t("addTier")}
            </button>
          )}
        </>
      )}

      {block.type === "PACKAGE" && (
        <>
          <div>
            <Label>{t("packageName")}</Label>
            <input
              className={inputClass}
              value={block.title}
              maxLength={60}
              placeholder={t("packageNamePlaceholder")}
              onChange={(e) => onChange({ ...block, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("packageServices")}</Label>
            <ServicePicker
              services={services}
              taken={takenIds}
              onPick={(s) =>
                onChange({
                  ...block,
                  items: [...block.items, { key: newKey(), serviceId: s.id, name: s.name, price: s.listPrice ? String(s.listPrice) : "" }],
                })
              }
            />
            {block.items.map((item) => (
              <div key={item.key} className="flex flex-wrap items-end gap-2">
                <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
                  <input
                    aria-label={t("itemName")}
                    className={inputClass}
                    value={item.name}
                    maxLength={80}
                    placeholder={t("itemName")}
                    onChange={(e) => setItem(item.key, { ...item, name: e.target.value })}
                  />
                </div>
                <div className="w-28 shrink-0">
                  <input
                    aria-label={t("itemPrice")}
                    inputMode="numeric"
                    className={inputClass}
                    value={item.price}
                    placeholder={t("itemPrice")}
                    onChange={(e) => setItem(item.key, { ...item, price: e.target.value.replace(/[^0-9.]/g, "") })}
                  />
                </div>
                <RemoveButton label={t("removeItem")} onClick={() => onChange({ ...block, items: block.items.filter((x) => x.key !== item.key) })} />
              </div>
            ))}
            {block.items.length < 12 && (
              <button
                type="button"
                className={btnSecondarySm}
                onClick={() => onChange({ ...block, items: [...block.items, { key: newKey(), name: "", price: "" }] })}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("addCustomItem")}
              </button>
            )}
          </div>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="w-36">
              <Label>{t("packageDiscount")}</Label>
              <input
                inputMode="decimal"
                className={inputClass}
                value={block.discountPercent}
                placeholder="20"
                onChange={(e) => onChange({ ...block, discountPercent: e.target.value.replace(/[^0-9.]/g, "") })}
              />
            </div>
            {totals && (
              <p className="pb-3 text-sm font-semibold text-[var(--text-primary)]" data-testid="package-total">
                {t("packageTotal", { mrp: formatCurrency(totals.mrp), price: formatCurrency(totals.price) })}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function IncludedServicesInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const t = useTranslations("admin.offerStudio");
  const [text, setText] = useState("");
  const add = () => {
    const v = text.trim();
    if (!v || value.length >= 8 || value.some((x) => x.toLowerCase() === v.toLowerCase())) {
      setText("");
      return;
    }
    onChange([...value, v.slice(0, 60)]);
    setText("");
  };
  return (
    <div className="space-y-2">
      <input
        className={inputClass}
        value={text}
        maxLength={60}
        placeholder={t("includedPlaceholder")}
        disabled={value.length >= 8}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
      />
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] pl-3 pr-1.5 py-1 text-xs font-medium text-[var(--text-primary)]"
            >
              {v}
              <button
                type="button"
                aria-label={`Remove ${v}`}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-[var(--border)]"
                onClick={() => onChange(value.filter((x) => x !== v))}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
