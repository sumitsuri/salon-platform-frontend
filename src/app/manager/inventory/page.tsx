"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

const MOVEMENT_LABELS: Record<MovementType, string> = {
  RESTOCK: "Restock",
  USAGE: "Usage",
  WASTAGE: "Wastage",
  RETAIL_SALE: "Retail sale",
  ADJUSTMENT: "Adjustment",
};

const LOG_TYPES: MovementType[] = ["RESTOCK", "USAGE", "WASTAGE", "RETAIL_SALE"];

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  CONSUMABLE: "Consumable",
  RETAIL: "Retail",
  EQUIPMENT: "Equipment",
};

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
      <PageHeader title="Inventory" subtitle={user?.branchName ?? "Branch stock"} />

      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      <button type="button" onClick={() => setDrawer({ mode: "create" })} className={btnPrimary}>
        <Plus className="w-4 h-4" /> Log usage / restock
      </button>

      <Card padding={false}>
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <h2 className="font-semibold text-sm">Current stock</h2>
        </div>
        {stockLoading ? (
          <p className="p-4 text-sm text-[var(--text-secondary)]">Loading...</p>
        ) : stock.length === 0 ? (
          <EmptyState title="No stock" description="Ask CEO to set up products, then log a restock" />
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
                        {s.outOfStock ? "Out" : s.lowStock ? "Low" : formatCurrency(s.stockValue)}
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
          <h2 className="font-semibold text-sm">This month&apos;s movements</h2>
        </div>
        {movLoading ? (
          <p className="p-4 text-sm text-[var(--text-secondary)]">Loading...</p>
        ) : movements.length === 0 ? (
          <EmptyState title="No movements yet" description="Log daily usage or restock receipts" />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {movements.map((m) => (
              <button key={m.id} type="button" onClick={() => setDrawer({ mode: "view", movement: m })} className="w-full text-left">
                <ListRow
                  title={`${MOVEMENT_LABELS[m.movementType]} · ${m.productName}`}
                  subtitle={m.movementDate}
                  trailing={
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{formatCurrency(m.totalCost)}</span>
                      <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
                    </div>
                  }
                />
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
  const movement = drawer.mode === "view" ? drawer.movement : null;
  const isView = drawer.mode === "view";

  const title = isView ? MOVEMENT_LABELS[movement!.movementType] : "Log movement";
  const subtitle = isView ? movement!.productName : "Updates branch stock and finance sync";

  return (
    <SideSheet open onClose={onClose} title={title} subtitle={subtitle}>
      {isView && movement && (
        <div className="space-y-4">
          <DetailField label="Product" value={movement.productName} />
          <DetailField label="Vendor" value={movement.vendorName || "—"} />
          <DetailField label="Quantity" value={String(movement.quantity)} />
          <DetailField label="Cost" value={formatCurrency(movement.totalCost)} />
          <DetailField label="Date" value={movement.movementDate} />
          {movement.note && <DetailField label="Note" value={movement.note} />}
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
      <Field label="Product">
        <select value={productId} onChange={(e) => setProductId(e.target.value)} className={selectClass} required>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Type">
        <select value={movementType} onChange={(e) => setMovementType(e.target.value as MovementType)} className={selectClass}>
          {LOG_TYPES.map((t) => (
            <option key={t} value={t}>
              {MOVEMENT_LABELS[t]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Quantity">
        <input type="number" min="0.001" step="0.001" className={inputClass} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
      </Field>
      <Field label="Date">
        <input type="date" className={inputClass} value={movementDate} onChange={(e) => setMovementDate(e.target.value)} required />
      </Field>
      <Field label="Note">
        <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onCancel} className={`${btnSecondary} flex-1`}>
          Cancel
        </button>
        <button type="submit" disabled={loading} className={`${btnPrimary} flex-1`}>
          {loading ? "Saving..." : "Save"}
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
          Log movement
        </button>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-[var(--border)] p-4 bg-[var(--surface-muted)]/40">
          <p className="text-xs font-semibold text-[var(--text-secondary)] mb-1">On hand</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {s.quantity} {s.unit}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Value: {formatCurrency(s.stockValue)}</p>
          {(s.lowStock || s.outOfStock) && (
            <p className={cn("text-xs font-semibold mt-2", s.outOfStock ? "text-red-600" : "text-amber-600")}>
              {s.outOfStock ? "Out of stock" : "Low stock"}
            </p>
          )}
        </div>
        <DetailField label="SKU" value={s.sku || "—"} />
        <DetailField label="Category" value={CATEGORY_LABELS[s.category]} />
        <DetailField label="Unit cost" value={formatCurrency(s.unitCost)} />
        {s.reorderLevel != null && <DetailField label="Reorder level" value={String(s.reorderLevel)} />}
      </div>
    </SideSheet>
  );
}
