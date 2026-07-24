"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ChevronRight, Plus } from "lucide-react";
import {
  api,
  CreateInventoryMovementRequest,
  InventoryMovementItem,
  InventoryProductItem,
  MovementType,
  ProductCategory,
  StockItem,
} from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth-store";
import {
  PageHeader,
  Card,
  ListRow,
  EmptyState,
  AlertBanner,
  SideSheet,
  DetailField,
  inputClass,
  selectClass,
  btnPrimary,
  btnSecondary,
} from "@/components/ui";
import { MissionStrip } from "@/components/brand/MissionStrip";

const LOG_TYPES: MovementType[] = ["RESTOCK", "USAGE", "WASTAGE", "RETAIL_SALE"];

type DrawerState =
  | { mode: "create"; productId?: string }
  | { mode: "view"; movement: InventoryMovementItem };
type StockDrawer = { mode: "view"; item: StockItem };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export default function ManagerInventoryPage() {
  const t = useTranslations("manager.inventory");
  const tCommon = useTranslations("common");
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [stockDrawer, setStockDrawer] = useState<StockDrawer | null>(null);
  const [error, setError] = useState("");

  const branchId = user?.branchId ?? "";

  const { data: stock = [], isLoading: stockLoading } = useQuery({
    queryKey: ["inventory-stock", branchId],
    queryFn: () => api.getInventoryStock(branchId),
    enabled: !!branchId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["inventory-products"],
    queryFn: () => api.getInventoryProducts(),
  });

  const monthStart = new Date();
  const from = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}-01`;
  const to = monthStart.toISOString().slice(0, 10);

  const { data: movements = [], isLoading: movLoading } = useQuery({
    queryKey: ["inventory-movements", branchId, from, to],
    queryFn: () => api.getInventoryMovements({ branchId, fromDate: from, toDate: to }),
    enabled: !!branchId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });
    queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateInventoryMovementRequest) => api.createInventoryMovement(data),
    onSuccess: () => {
      invalidate();
      setDrawer(null);
      setStockDrawer(null);
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="space-y-5">
      <PageHeader title={t("title")} subtitle={user?.branchName ?? t("subtitleDefault")} />

      <MissionStrip />

      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      <button type="button" onClick={() => setDrawer({ mode: "create" })} className={btnPrimary}>
        <Plus className="w-4 h-4" /> {t("logUsageRestock")}
      </button>

      <Card padding={false}>
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <h2 className="font-semibold text-sm">{t("currentStock")}</h2>
        </div>
        {stockLoading ? (
          <p className="p-4 text-sm text-[var(--text-secondary)]">{tCommon("loading")}</p>
        ) : stock.length === 0 ? (
          <EmptyState title={t("noStockTitle")} description={t("noStockDesc")} />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {stock.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStockDrawer({ mode: "view", item: s })}
                className="w-full text-left hover:bg-[var(--surface-muted)]/60 transition"
              >
                <ListRow
                  title={s.productName}
                  subtitle={`${s.vendorName} · ${s.quantity} ${s.unit}`}
                  trailing={
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${s.outOfStock ? "text-red-600" : s.lowStock ? "text-amber-600" : ""}`}>
                        {s.outOfStock ? t("out") : s.lowStock ? t("low") : formatCurrency(s.stockValue)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
                    </div>
                  }
                />
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card padding={false}>
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <h2 className="font-semibold text-sm">{t("thisMonthMovements")}</h2>
        </div>
        {movLoading ? (
          <p className="p-4 text-sm text-[var(--text-secondary)]">{tCommon("loading")}</p>
        ) : movements.length === 0 ? (
          <EmptyState title={t("noMovementsTitle")} description={t("noMovementsDesc")} />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {movements.map((m) => (
              <button key={m.id} type="button" onClick={() => setDrawer({ mode: "view", movement: m })} className="w-full text-left">
                <MovementListRow movement={m} />
              </button>
            ))}
          </div>
        )}
      </Card>

      {drawer && (
        <MovementDrawer
          drawer={drawer}
          branchId={branchId}
          products={products}
          loading={createMutation.isPending}
          onClose={() => setDrawer(null)}
          onCreate={(data) => createMutation.mutate(data)}
        />
      )}

      {stockDrawer && (
        <StockDrawer
          drawer={stockDrawer}
          onClose={() => setStockDrawer(null)}
          onLogMovement={(productId) => {
            setStockDrawer(null);
            setDrawer({ mode: "create", productId });
          }}
        />
      )}
    </div>
  );
}

function MovementListRow({ movement }: { movement: InventoryMovementItem }) {
  const t = useTranslations("manager.inventory.movementTypes");
  return (
    <ListRow
      title={`${t(movement.movementType)} · ${movement.productName}`}
      subtitle={movement.movementDate}
      trailing={
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">{formatCurrency(movement.totalCost)}</span>
          <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
        </div>
      }
    />
  );
}

function MovementDrawer({
  drawer,
  branchId,
  products,
  loading,
  onClose,
  onCreate,
}: {
  drawer: DrawerState;
  branchId: string;
  products: InventoryProductItem[];
  loading: boolean;
  onClose: () => void;
  onCreate: (data: CreateInventoryMovementRequest) => void;
}) {
  const t = useTranslations("manager.inventory");
  const tTypes = useTranslations("manager.inventory.movementTypes");
  const movement = drawer.mode === "view" ? drawer.movement : null;
  const isView = drawer.mode === "view";

  const title = isView ? tTypes(movement!.movementType) : t("logMovement");
  const subtitle = isView ? movement!.productName : t("logMovementSubtitle");

  return (
    <SideSheet open onClose={onClose} title={title} subtitle={subtitle}>
      {isView && movement && (
        <div className="space-y-4">
          <DetailField label={t("fields.product")} value={movement.productName} />
          <DetailField label={t("fields.vendor")} value={movement.vendorName || "—"} />
          <DetailField label={t("fields.quantity")} value={String(movement.quantity)} />
          <DetailField label={t("fields.cost")} value={formatCurrency(movement.totalCost)} />
          <DetailField label={t("fields.date")} value={movement.movementDate} />
          {movement.note && <DetailField label={t("fields.note")} value={movement.note} />}
        </div>
      )}
      {drawer.mode === "create" && (
        <MovementForm
          branchId={branchId}
          products={products}
          presetProductId={drawer.productId}
          loading={loading}
          onCancel={onClose}
          onSubmit={onCreate}
        />
      )}
    </SideSheet>
  );
}

function MovementForm({
  branchId,
  products,
  presetProductId,
  loading,
  onCancel,
  onSubmit,
}: {
  branchId: string;
  products: InventoryProductItem[];
  presetProductId?: string;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (data: CreateInventoryMovementRequest) => void;
}) {
  const t = useTranslations("manager.inventory");
  const tTypes = useTranslations("manager.inventory.movementTypes");
  const tCommon = useTranslations("common");
  const today = new Date().toISOString().slice(0, 10);
  const [productId, setProductId] = useState(presetProductId ?? products[0]?.id ?? "");
  const [movementType, setMovementType] = useState<MovementType>("USAGE");
  const [quantity, setQuantity] = useState("");
  const [movementDate, setMovementDate] = useState(today);
  const [note, setNote] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      branchId,
      productId,
      movementType,
      quantity: parseFloat(quantity),
      movementDate,
      note: note || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-2">
      <Field label={t("fields.product")}>
        <select value={productId} onChange={(e) => setProductId(e.target.value)} className={selectClass} required>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("fields.type")}>
        <select value={movementType} onChange={(e) => setMovementType(e.target.value as MovementType)} className={selectClass}>
          {LOG_TYPES.map((type) => (
            <option key={type} value={type}>
              {tTypes(type)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("fields.quantity")}>
        <input type="number" min="0.001" step="0.001" className={inputClass} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
      </Field>
      <Field label={t("fields.date")}>
        <input type="date" className={inputClass} value={movementDate} onChange={(e) => setMovementDate(e.target.value)} required />
      </Field>
      <Field label={t("fields.note")}>
        <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onCancel} className={`${btnSecondary} flex-1`}>
          {tCommon("cancel")}
        </button>
        <button type="submit" disabled={loading} className={`${btnPrimary} flex-1`}>
          {loading ? t("saving") : t("save")}
        </button>
      </div>
    </form>
  );
}

function StockDrawer({
  drawer,
  onClose,
  onLogMovement,
}: {
  drawer: StockDrawer;
  onClose: () => void;
  onLogMovement: (productId: string) => void;
}) {
  const t = useTranslations("manager.inventory");
  const tCategories = useTranslations("manager.inventory.categories");
  const s = drawer.item;

  return (
    <SideSheet
      open
      onClose={onClose}
      title={s.productName}
      subtitle={s.vendorName}
      footer={
        <button type="button" onClick={() => onLogMovement(s.productId)} className={`${btnPrimary} w-full`}>
          <Plus className="w-4 h-4" />
          {t("logMovement")}
        </button>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-[var(--border)] p-4 bg-[var(--surface-muted)]/40">
          <p className="text-xs font-semibold text-[var(--text-secondary)] mb-1">{t("onHand")}</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {s.quantity} {s.unit}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {t("value")}: {formatCurrency(s.stockValue)}
          </p>
          {(s.lowStock || s.outOfStock) && (
            <p className={cn("text-xs font-semibold mt-2", s.outOfStock ? "text-red-600" : "text-amber-600")}>
              {s.outOfStock ? t("outOfStock") : t("lowStock")}
            </p>
          )}
        </div>
        <DetailField label={t("fields.sku")} value={s.sku || "—"} />
        <DetailField label={t("fields.category")} value={tCategories(s.category as ProductCategory)} />
        <DetailField label={t("fields.unitCost")} value={formatCurrency(s.unitCost)} />
        {s.reorderLevel != null && <DetailField label={t("fields.reorderLevel")} value={String(s.reorderLevel)} />}
      </div>
    </SideSheet>
  );
}
