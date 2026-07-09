"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, ChevronRight, Package, Pencil, Plus, Trash2 } from "lucide-react";
import {
  api,
  CreateInventoryMovementRequest,
  CreateInventoryProductRequest,
  CreateVendorRequest,
  InventoryMovementItem,
  InventoryProductItem,
  MovementType,
  ProductCategory,
  StockItem,
  UpdateInventoryProductRequest,
  UpdateVendorRequest,
  VendorItem,
} from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import { BranchMultiSelect } from "@/components/BranchMultiSelect";
import { MonthYearPicker, currentMonthIso, formatMonthYear } from "@/components/MonthYearPicker";
import { InventoryTrends } from "@/components/InventoryTrends";
import {
  PageHeader,
  Card,
  StatCard,
  ListRow,
  EmptyState,
  AlertBanner,
  SideSheet,
  DetailField,
  SegmentedControl,
  inputClass,
  selectClass,
  btnPrimary,
  btnSecondary,
} from "@/components/ui";

type Tab = "overview" | "products" | "vendors" | "stock" | "movements";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "products", label: "Products" },
  { id: "vendors", label: "Vendors" },
  { id: "stock", label: "Stock" },
  { id: "movements", label: "Movements" },
];

const CATEGORIES: ProductCategory[] = ["CONSUMABLE", "RETAIL", "EQUIPMENT"];
const UNITS = ["ML", "G", "PCS", "BOTTLE"] as const;
const MOVEMENT_TYPES: MovementType[] = ["RESTOCK", "USAGE", "WASTAGE", "RETAIL_SALE", "ADJUSTMENT"];

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  CONSUMABLE: "Consumable",
  RETAIL: "Retail",
  EQUIPMENT: "Equipment",
};

const MOVEMENT_LABELS: Record<MovementType, string> = {
  RESTOCK: "Restock",
  USAGE: "Usage",
  WASTAGE: "Wastage",
  RETAIL_SALE: "Retail sale",
  ADJUSTMENT: "Adjustment",
};

type ProductDrawer =
  | { mode: "create" }
  | { mode: "view" | "edit"; product: InventoryProductItem };
type VendorDrawer = { mode: "create" } | { mode: "view" | "edit"; vendor: VendorItem };
type MovementDrawer =
  | { mode: "create"; branchId?: string; productId?: string }
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

export default function AdminInventoryPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthIso);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState("");
  const [productDrawer, setProductDrawer] = useState<ProductDrawer | null>(null);
  const [vendorDrawer, setVendorDrawer] = useState<VendorDrawer | null>(null);
  const [movementDrawer, setMovementDrawer] = useState<MovementDrawer | null>(null);
  const [stockDrawer, setStockDrawer] = useState<StockDrawer | null>(null);

  const branchFilter =
    selectedBranches.length > 0 && selectedBranches.length < 999
      ? selectedBranches
      : undefined;

  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: () => api.getBranches(),
  });

  useEffect(() => {
    if (branchesLoading) return;
    if (!initialized) {
      if (branches.length > 0) setSelectedBranches(branches.map((b) => b.id));
      setInitialized(true);
    }
  }, [branches, branchesLoading, initialized]);

  const effectiveBranchFilter =
    selectedBranches.length > 0 && selectedBranches.length < branches.length ? selectedBranches : undefined;

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["inventory-overview", selectedMonth, selectedBranches],
    queryFn: () =>
      api.getInventoryOverview({ month: selectedMonth, branchIds: effectiveBranchFilter }),
    enabled: initialized && tab === "overview",
  });

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ["inventory-trends", selectedMonth, selectedBranches],
    queryFn: () =>
      api.getInventoryTrends({ endMonth: selectedMonth, months: 6, branchIds: effectiveBranchFilter }),
    enabled: initialized && tab === "overview",
  });

  const { data: products = [] } = useQuery({
    queryKey: ["inventory-products"],
    queryFn: () => api.getInventoryProducts(),
    enabled: initialized,
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["inventory-vendors"],
    queryFn: () => api.getInventoryVendors(),
    enabled: initialized,
  });

  const { data: stock = [], isLoading: stockLoading } = useQuery({
    queryKey: ["inventory-stock", selectedBranches],
    queryFn: () => api.getInventoryStock(),
    enabled: initialized && (tab === "stock" || tab === "overview"),
  });

  const monthRange = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const last = new Date(y, m, 0).getDate();
    return {
      from: selectedMonth,
      to: `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`,
    };
  }, [selectedMonth]);

  const { data: movements = [], isLoading: movementsLoading } = useQuery({
    queryKey: ["inventory-movements", monthRange.from, monthRange.to, selectedBranches],
    queryFn: () => api.getInventoryMovements({ fromDate: monthRange.from, toDate: monthRange.to }),
    enabled: initialized && tab === "movements",
  });

  const filteredStock = useMemo(() => {
    if (!effectiveBranchFilter) return stock;
    const set = new Set(effectiveBranchFilter);
    return stock.filter((s) => set.has(s.branchId));
  }, [stock, effectiveBranchFilter]);

  const filteredMovements = useMemo(() => {
    if (!effectiveBranchFilter) return movements;
    const set = new Set(effectiveBranchFilter);
    return movements.filter((m) => set.has(m.branchId));
  }, [movements, effectiveBranchFilter]);

  const stockByBranch = useMemo(() => {
    const map = new Map<string, StockItem[]>();
    for (const s of filteredStock) {
      if (!map.has(s.branchId)) map.set(s.branchId, []);
      map.get(s.branchId)!.push(s);
    }
    return branches
      .filter((b) => selectedBranches.includes(b.id))
      .map((b) => ({ branch: b, items: map.get(b.id) ?? [] }));
  }, [filteredStock, branches, selectedBranches]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["inventory-products"] });
    queryClient.invalidateQueries({ queryKey: ["inventory-vendors"] });
    queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });
    queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
    queryClient.invalidateQueries({ queryKey: ["inventory-overview"] });
    queryClient.invalidateQueries({ queryKey: ["inventory-trends"] });
    queryClient.invalidateQueries({ queryKey: ["pl-summary"] });
    queryClient.invalidateQueries({ queryKey: ["expenditures"] });
  };

  const createMovement = useMutation({
    mutationFn: (data: CreateInventoryMovementRequest) => api.createInventoryMovement(data),
    onSuccess: () => {
      invalidate();
      setMovementDrawer(null);
      setStockDrawer(null);
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  const createProduct = useMutation({
    mutationFn: (data: CreateInventoryProductRequest) => api.createInventoryProduct(data),
    onSuccess: () => {
      invalidate();
      setProductDrawer(null);
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInventoryProductRequest }) =>
      api.updateInventoryProduct(id, data),
    onSuccess: () => {
      invalidate();
      setProductDrawer(null);
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteProduct = useMutation({
    mutationFn: (id: string) => api.deactivateInventoryProduct(id),
    onSuccess: () => {
      invalidate();
      setProductDrawer(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const createVendor = useMutation({
    mutationFn: (data: CreateVendorRequest) => api.createInventoryVendor(data),
    onSuccess: () => {
      invalidate();
      setVendorDrawer(null);
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  const updateVendor = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVendorRequest }) =>
      api.updateInventoryVendor(id, data),
    onSuccess: () => {
      invalidate();
      setVendorDrawer(null);
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteVendor = useMutation({
    mutationFn: (id: string) => api.deactivateInventoryVendor(id),
    onSuccess: () => {
      invalidate();
      setVendorDrawer(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const formLoading =
    createProduct.isPending ||
    updateProduct.isPending ||
    createVendor.isPending ||
    updateVendor.isPending ||
    createMovement.isPending;

  if (!initialized || branchesLoading) {
    return <p className="text-center py-8 text-sm text-[var(--text-tertiary)]">Loading inventory...</p>;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inventory"
        subtitle={tab === "overview" ? formatMonthYear(selectedMonth) : "Products, vendors & branch stock"}
        action={tab === "overview" ? <MonthYearPicker value={selectedMonth} onChange={setSelectedMonth} /> : undefined}
      />

      <BranchMultiSelect branches={branches} selected={selectedBranches} onChange={setSelectedBranches} />

      <SegmentedControl value={tab} onChange={setTab} options={TABS} />

      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      {tab === "overview" && (
        <div className="space-y-5">
          {overviewLoading || !overview ? (
            <p className="text-center py-8 text-sm text-[var(--text-tertiary)]">Loading overview...</p>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label="Product cost" value={formatCurrency(overview.totalProductCost)} icon={Package} accent="amber" />
                <StatCard label="Stock value" value={formatCurrency(overview.totalStockValue)} icon={Building2} accent="brand" />
                <StatCard label="Low stock" value={overview.lowStockCount} icon={Package} accent="amber" />
                <StatCard label="Out of stock" value={overview.outOfStockCount} icon={Package} accent="violet" />
              </div>

              {overview.topCostProductName && (
                <Card className="text-sm">
                  <span className="text-[var(--text-secondary)]">Top cost driver: </span>
                  <span className="font-semibold">{overview.topCostProductName}</span>
                  <span className="text-[var(--text-secondary)]"> · {formatCurrency(overview.topCostProductAmount)}</span>
                </Card>
              )}

              {!trendsLoading && trends && trends.branches.length > 0 && (
                <InventoryTrends branches={trends.branches} periodLabel={trends.periodLabel} />
              )}

              <Card padding={false}>
                <div className="px-4 py-3 border-b border-[var(--border)]">
                  <h2 className="font-semibold text-sm">Branch summary</h2>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {overview.branches.map((b) => (
                    <ListRow
                      key={b.branchId}
                      title={b.branchName}
                      subtitle={`${b.movementCount} movements · ${b.lowStockCount} low stock`}
                      trailing={
                        <div className="text-right text-sm">
                          <p className="font-bold">{formatCurrency(b.productCost)}</p>
                          <p className="text-xs text-[var(--text-tertiary)]">stock {formatCurrency(b.stockValue)}</p>
                        </div>
                      }
                    />
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {tab === "products" && (
        <div className="space-y-4">
          <button type="button" onClick={() => setProductDrawer({ mode: "create" })} className={btnPrimary}>
            <Plus className="w-4 h-4" /> Add product
          </button>
          {products.length === 0 ? (
            <EmptyState title="No products" description="Add SKU-level products linked to vendors" />
          ) : (
            <Card padding={false}>
              <div className="divide-y divide-[var(--border)]">
                {products.map((p) => (
                  <button key={p.id} type="button" onClick={() => setProductDrawer({ mode: "view", product: p })} className="w-full text-left">
                    <ListRow
                      title={p.name}
                      subtitle={`${CATEGORY_LABELS[p.category]} · ${p.vendorName} · ${p.sku || "no SKU"}`}
                      trailing={
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{formatCurrency(p.unitCost)}</span>
                          <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
                        </div>
                      }
                    />
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === "vendors" && (
        <div className="space-y-4">
          <button type="button" onClick={() => setVendorDrawer({ mode: "create" })} className={btnPrimary}>
            <Plus className="w-4 h-4" /> Add vendor
          </button>
          {vendors.length === 0 ? (
            <EmptyState title="No vendors" description="Add suppliers you procure inventory from" />
          ) : (
            <Card padding={false}>
              <div className="divide-y divide-[var(--border)]">
                {vendors.map((v) => (
                  <button key={v.id} type="button" onClick={() => setVendorDrawer({ mode: "view", vendor: v })} className="w-full text-left">
                    <ListRow
                      title={v.name}
                      subtitle={[v.contactPhone, v.contactEmail].filter(Boolean).join(" · ") || "No contact"}
                      trailing={<ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />}
                    />
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === "stock" && (
        <div className="space-y-4">
          <button type="button" onClick={() => setMovementDrawer({ mode: "create" })} className={btnPrimary}>
            <Plus className="w-4 h-4" /> Log movement
          </button>
          {stockLoading ? (
            <p className="text-center py-8 text-sm text-[var(--text-tertiary)]">Loading stock...</p>
          ) : (
            <div className="grid gap-4">
              {stockByBranch.map(({ branch, items }) => (
                <Card key={branch.id} padding={false}>
                  <div className="px-4 py-3 border-b border-[var(--border)] flex justify-between items-center">
                    <h3 className="font-semibold text-sm">{branch.name}</h3>
                    <button
                      type="button"
                      onClick={() => setMovementDrawer({ mode: "create", branchId: branch.id })}
                      className="text-xs font-semibold text-[var(--brand-text)]"
                    >
                      + Log
                    </button>
                  </div>
                  {items.length === 0 ? (
                    <p className="p-4 text-sm text-[var(--text-secondary)]">No stock records — log a restock first.</p>
                  ) : (
                    <div className="divide-y divide-[var(--border)]">
                      {items.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setStockDrawer({ mode: "view", item: s })}
                          className="w-full text-left hover:bg-[var(--surface-muted)]/60 transition"
                        >
                          <ListRow
                            title={s.productName}
                            subtitle={`${s.vendorName} · ${s.quantity} ${s.unit}${s.lowStock ? " · Low" : ""}${s.outOfStock ? " · Out" : ""}`}
                            trailing={
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold">{formatCurrency(s.stockValue)}</span>
                                <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
                              </div>
                            }
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "movements" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-[var(--text-secondary)]">{formatMonthYear(selectedMonth)}</p>
            <button type="button" onClick={() => setMovementDrawer({ mode: "create" })} className={btnPrimary}>
              <Plus className="w-4 h-4" /> Log movement
            </button>
          </div>
          {movementsLoading ? (
            <p className="text-center py-8 text-sm text-[var(--text-tertiary)]">Loading movements...</p>
          ) : filteredMovements.length === 0 ? (
            <EmptyState title="No movements" description="Log restock, usage, wastage, or retail sales" />
          ) : (
            <Card padding={false}>
              <div className="divide-y divide-[var(--border)]">
                {filteredMovements.map((m) => (
                  <button key={m.id} type="button" onClick={() => setMovementDrawer({ mode: "view", movement: m })} className="w-full text-left">
                    <ListRow
                      title={`${MOVEMENT_LABELS[m.movementType]} · ${m.productName}`}
                      subtitle={`${m.branchName} · ${m.vendorName} · ${m.movementDate}`}
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
            </Card>
          )}
        </div>
      )}

      {productDrawer && (
        <ProductDrawer
          drawer={productDrawer}
          vendors={vendors}
          loading={formLoading}
          onClose={() => setProductDrawer(null)}
          onEdit={() =>
            productDrawer.mode === "view" && setProductDrawer({ mode: "edit", product: productDrawer.product })
          }
          onBackToView={() =>
            productDrawer.mode === "edit" && setProductDrawer({ mode: "view", product: productDrawer.product })
          }
          onDeactivate={() => {
            if (productDrawer.mode !== "create" && window.confirm(`Deactivate ${productDrawer.product.name}?`)) {
              deleteProduct.mutate(productDrawer.product.id);
            }
          }}
          onCreate={(data) => createProduct.mutate(data)}
          onUpdate={(id, data) => updateProduct.mutate({ id, data })}
        />
      )}

      {vendorDrawer && (
        <VendorDrawer
          drawer={vendorDrawer}
          loading={formLoading}
          onClose={() => setVendorDrawer(null)}
          onEdit={() =>
            vendorDrawer.mode === "view" && setVendorDrawer({ mode: "edit", vendor: vendorDrawer.vendor })
          }
          onBackToView={() =>
            vendorDrawer.mode === "edit" && setVendorDrawer({ mode: "view", vendor: vendorDrawer.vendor })
          }
          onDeactivate={() => {
            if (vendorDrawer.mode !== "create" && window.confirm(`Deactivate ${vendorDrawer.vendor.name}?`)) {
              deleteVendor.mutate(vendorDrawer.vendor.id);
            }
          }}
          onCreate={(data) => createVendor.mutate(data)}
          onUpdate={(id, data) => updateVendor.mutate({ id, data })}
        />
      )}

      {movementDrawer && (
        <MovementDrawer
          drawer={movementDrawer}
          branches={branches.filter((b) => selectedBranches.includes(b.id))}
          products={products}
          loading={createMovement.isPending}
          onClose={() => setMovementDrawer(null)}
          onCreate={(data) => createMovement.mutate(data)}
        />
      )}

      {stockDrawer && (
        <StockDrawer
          drawer={stockDrawer}
          onClose={() => setStockDrawer(null)}
          onLogMovement={(branchId, productId) => {
            setStockDrawer(null);
            setMovementDrawer({ mode: "create", branchId, productId });
          }}
        />
      )}
    </div>
  );
}

function ProductDrawer({
  drawer,
  vendors,
  loading,
  onClose,
  onEdit,
  onBackToView,
  onDeactivate,
  onCreate,
  onUpdate,
}: {
  drawer: ProductDrawer;
  vendors: VendorItem[];
  loading: boolean;
  onClose: () => void;
  onEdit: () => void;
  onBackToView: () => void;
  onDeactivate: () => void;
  onCreate: (data: CreateInventoryProductRequest) => void;
  onUpdate: (id: string, data: UpdateInventoryProductRequest) => void;
}) {
  const product = drawer.mode !== "create" ? drawer.product : null;
  const isView = drawer.mode === "view";
  const isForm = drawer.mode === "create" || drawer.mode === "edit";

  const title =
    drawer.mode === "create" ? "Add product" : drawer.mode === "edit" ? "Edit product" : product?.name ?? "";
  const subtitle =
    drawer.mode === "create"
      ? "Define SKU, unit cost, and reorder level"
      : drawer.mode === "edit"
        ? "Update catalog details and pricing"
        : [product?.vendorName, product?.sku].filter(Boolean).join(" · ");

  return (
    <SideSheet
      open
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      wide
      footer={
        isView && product ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <button type="button" onClick={onEdit} className={`${btnPrimary} flex-1`}>
              <Pencil className="w-4 h-4" />
              Edit product
            </button>
            <button
              type="button"
              onClick={onDeactivate}
              className={`${btnSecondary} flex-1 text-red-600 border-red-200 hover:bg-red-50`}
            >
              <Trash2 className="w-4 h-4" />
              Deactivate
            </button>
          </div>
        ) : undefined
      }
    >
      {isView && product && (
        <div className="space-y-4">
          <DetailField label="Vendor" value={product.vendorName} />
          <DetailField label="SKU" value={product.sku || "—"} />
          <DetailField label="Category" value={CATEGORY_LABELS[product.category]} />
          <DetailField label="Unit" value={product.unit} />
          <DetailField label="Unit cost" value={formatCurrency(product.unitCost)} />
          {product.retailPrice != null && <DetailField label="Retail price" value={formatCurrency(product.retailPrice)} />}
          {product.reorderLevel != null && <DetailField label="Reorder level" value={String(product.reorderLevel)} />}
        </div>
      )}
      {isForm && (
        <ProductForm
          key={drawer.mode === "create" ? "create" : product!.id}
          vendors={vendors}
          product={product}
          loading={loading}
          onCancel={() => {
            if (drawer.mode === "edit") onBackToView();
            else onClose();
          }}
          onSubmit={(data) => {
            if (drawer.mode === "create") onCreate(data as CreateInventoryProductRequest);
            else if (product) onUpdate(product.id, data);
          }}
          cancelLabel={drawer.mode === "edit" ? "Back to details" : "Cancel"}
        />
      )}
    </SideSheet>
  );
}

function ProductForm({
  vendors,
  product,
  loading,
  onCancel,
  onSubmit,
  cancelLabel = "Cancel",
}: {
  vendors: VendorItem[];
  product: InventoryProductItem | null;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (data: CreateInventoryProductRequest | UpdateInventoryProductRequest) => void;
  cancelLabel?: string;
}) {
  const [vendorId, setVendorId] = useState(product?.vendorId ?? vendors[0]?.id ?? "");
  const [name, setName] = useState(product?.name ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [category, setCategory] = useState<ProductCategory>(product?.category ?? "CONSUMABLE");
  const [unit, setUnit] = useState(product?.unit ?? "PCS");
  const [unitCost, setUnitCost] = useState(product ? String(product.unitCost) : "");
  const [retailPrice, setRetailPrice] = useState(product?.retailPrice != null ? String(product.retailPrice) : "");
  const [reorderLevel, setReorderLevel] = useState(product?.reorderLevel != null ? String(product.reorderLevel) : "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      vendorId,
      name,
      sku: sku || undefined,
      category,
      unit,
      unitCost: parseFloat(unitCost),
      retailPrice: retailPrice ? parseFloat(retailPrice) : undefined,
      reorderLevel: reorderLevel ? parseFloat(reorderLevel) : undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-2">
      <Field label="Vendor">
        <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={selectClass} required>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Name">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field label="SKU">
        <input className={inputClass} value={sku} onChange={(e) => setSku(e.target.value)} />
      </Field>
      <Field label="Category">
        <select value={category} onChange={(e) => setCategory(e.target.value as ProductCategory)} className={selectClass}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Unit">
        <select value={unit} onChange={(e) => setUnit(e.target.value as typeof unit)} className={selectClass}>
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Unit cost (₹)">
        <input type="number" min="0" step="0.01" className={inputClass} value={unitCost} onChange={(e) => setUnitCost(e.target.value)} required />
      </Field>
      <Field label="Retail price (₹)">
        <input type="number" min="0" step="0.01" className={inputClass} value={retailPrice} onChange={(e) => setRetailPrice(e.target.value)} />
      </Field>
      <Field label="Reorder level">
        <input type="number" min="0" step="0.001" className={inputClass} value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} />
      </Field>
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onCancel} className={`${btnSecondary} flex-1`}>
          {cancelLabel}
        </button>
        <button type="submit" disabled={loading} className={`${btnPrimary} flex-1`}>
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}

function VendorDrawer({
  drawer,
  loading,
  onClose,
  onEdit,
  onBackToView,
  onDeactivate,
  onCreate,
  onUpdate,
}: {
  drawer: VendorDrawer;
  loading: boolean;
  onClose: () => void;
  onEdit: () => void;
  onBackToView: () => void;
  onDeactivate: () => void;
  onCreate: (data: CreateVendorRequest) => void;
  onUpdate: (id: string, data: UpdateVendorRequest) => void;
}) {
  const vendor = drawer.mode !== "create" ? drawer.vendor : null;
  const isView = drawer.mode === "view";
  const isForm = drawer.mode === "create" || drawer.mode === "edit";

  const title = drawer.mode === "create" ? "Add vendor" : drawer.mode === "edit" ? "Edit vendor" : vendor?.name ?? "";
  const subtitle =
    drawer.mode === "create"
      ? "Supplier contact for purchase orders"
      : drawer.mode === "edit"
        ? "Update contact details"
        : vendor?.contactPhone || vendor?.contactEmail || undefined;

  return (
    <SideSheet
      open
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      footer={
        isView && vendor ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <button type="button" onClick={onEdit} className={`${btnPrimary} flex-1`}>
              <Pencil className="w-4 h-4" />
              Edit vendor
            </button>
            <button
              type="button"
              onClick={onDeactivate}
              className={`${btnSecondary} flex-1 text-red-600 border-red-200 hover:bg-red-50`}
            >
              <Trash2 className="w-4 h-4" />
              Deactivate
            </button>
          </div>
        ) : undefined
      }
    >
      {isView && vendor && (
        <div className="space-y-4">
          <DetailField label="Phone" value={vendor.contactPhone || "—"} />
          <DetailField label="Email" value={vendor.contactEmail || "—"} />
          <DetailField label="Notes" value={vendor.notes || "—"} />
        </div>
      )}
      {isForm && (
        <VendorForm
          key={drawer.mode === "create" ? "create" : vendor!.id}
          vendor={vendor}
          loading={loading}
          onCancel={() => {
            if (drawer.mode === "edit") onBackToView();
            else onClose();
          }}
          onSubmit={(data) => {
            if (drawer.mode === "create") onCreate(data as CreateVendorRequest);
            else if (vendor) onUpdate(vendor.id, data);
          }}
          cancelLabel={drawer.mode === "edit" ? "Back to details" : "Cancel"}
        />
      )}
    </SideSheet>
  );
}

function VendorForm({
  vendor,
  loading,
  onCancel,
  onSubmit,
  cancelLabel = "Cancel",
}: {
  vendor: VendorItem | null;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (data: CreateVendorRequest | UpdateVendorRequest) => void;
  cancelLabel?: string;
}) {
  const [name, setName] = useState(vendor?.name ?? "");
  const [phone, setPhone] = useState(vendor?.contactPhone ?? "");
  const [email, setEmail] = useState(vendor?.contactEmail ?? "");
  const [notes, setNotes] = useState(vendor?.notes ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name,
      contactPhone: phone || undefined,
      contactEmail: email || undefined,
      notes: notes || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-2">
      <Field label="Name">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field label="Phone">
        <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
      </Field>
      <Field label="Email">
        <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Notes">
        <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onCancel} className={`${btnSecondary} flex-1`}>
          {cancelLabel}
        </button>
        <button type="submit" disabled={loading} className={`${btnPrimary} flex-1`}>
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}

function MovementDrawer({
  drawer,
  branches,
  products,
  loading,
  onClose,
  onCreate,
}: {
  drawer: MovementDrawer;
  branches: { id: string; name: string }[];
  products: InventoryProductItem[];
  loading: boolean;
  onClose: () => void;
  onCreate: (data: CreateInventoryMovementRequest) => void;
}) {
  const movement = drawer.mode === "view" ? drawer.movement : null;
  const isView = drawer.mode === "view";

  const title = isView ? MOVEMENT_LABELS[movement!.movementType] : "Log movement";
  const subtitle = isView
    ? `${movement!.branchName} · ${movement!.productName}`
    : "PRODUCT_COST in Finance auto-updates from movements";

  return (
    <SideSheet open onClose={onClose} title={title} subtitle={subtitle}>
      {isView && movement && (
        <div className="space-y-4">
          <DetailField label="Branch" value={movement.branchName} />
          <DetailField label="Product" value={movement.productName} />
          <DetailField label="Vendor" value={movement.vendorName || "—"} />
          <DetailField label="Quantity" value={`${movement.quantity}`} />
          <DetailField label="Total cost" value={formatCurrency(movement.totalCost)} />
          <DetailField label="Date" value={movement.movementDate} />
          {movement.recordedByName && <DetailField label="Recorded by" value={movement.recordedByName} />}
          {movement.note && <DetailField label="Note" value={movement.note} />}
          <p className="text-xs text-[var(--text-tertiary)] pt-2">
            Movements are immutable audit records. Use an adjustment entry to correct stock.
          </p>
        </div>
      )}
      {drawer.mode === "create" && (
        <MovementForm
          branches={branches}
          products={products}
          presetBranchId={drawer.branchId}
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
  branches,
  products,
  presetBranchId,
  presetProductId,
  loading,
  onCancel,
  onSubmit,
}: {
  branches: { id: string; name: string }[];
  products: InventoryProductItem[];
  presetBranchId?: string;
  presetProductId?: string;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (data: CreateInventoryMovementRequest) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [branchId, setBranchId] = useState(presetBranchId ?? branches[0]?.id ?? "");
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
      <Field label="Branch">
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={selectClass} required>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Product">
        <select value={productId} onChange={(e) => setProductId(e.target.value)} className={selectClass} required>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.vendorName})
            </option>
          ))}
        </select>
      </Field>
      <Field label="Type">
        <select value={movementType} onChange={(e) => setMovementType(e.target.value as MovementType)} className={selectClass}>
          {MOVEMENT_TYPES.map((t) => (
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
          {loading ? "Saving..." : "Save & sync finance"}
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
  onLogMovement: (branchId: string, productId: string) => void;
}) {
  const s = drawer.item;

  return (
    <SideSheet
      open
      onClose={onClose}
      title={s.productName}
      subtitle={`${s.branchName} · ${s.vendorName}`}
      footer={
        <button type="button" onClick={() => onLogMovement(s.branchId, s.productId)} className={`${btnPrimary} w-full`}>
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
