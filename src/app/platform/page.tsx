"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import {
  Building2,
  ChevronRight,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import {
  api,
  CreatePlatformBranchRequest,
  CreatePlatformUserRequest,
  CreateTenantRequest,
  PlatformBranch,
  PlatformUser,
  Tenant,
  UserRole,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { useSetPageBreadcrumbs } from "@/lib/breadcrumb-context";
import {
  PageHeader,
  Card,
  SegmentedControl,
  ListRow,
  EmptyState,
  AlertBanner,
  SideSheet,
  DetailField,
  inputClass,
  selectClass,
  btnPrimary,
  btnSecondary,
  StatusBadge,
} from "@/components/ui";
import { MissionStrip } from "@/components/brand/MissionStrip";

type Tab = "branches" | "employees";

type TenantDrawerState = { mode: "create" };
type BranchDrawerState = { mode: "create" } | { mode: "view"; branch: PlatformBranch };
type UserDrawerState = { mode: "create" } | { mode: "view"; user: PlatformUser };

const ONBOARD_ROLES: UserRole[] = ["BRAND_ADMIN", "BRANCH_MANAGER", "SALON_MANAGER"];

const btnViolet = `${btnPrimary} bg-violet-600 hover:bg-violet-700 active:bg-violet-800 shadow-violet-600/20`;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-[var(--text-secondary)]">{label}</span>
      {children}
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider pt-2 pb-1">
      {children}
    </p>
  );
}

export default function PlatformPage() {
  const t = useTranslations("platform.admin");
  const tLayout = useTranslations("platform.layout");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [tab, setTab] = useState<Tab>("branches");
  const [tenantDrawer, setTenantDrawer] = useState<TenantDrawerState | null>(null);
  const [branchDrawer, setBranchDrawer] = useState<BranchDrawerState | null>(null);
  const [userDrawer, setUserDrawer] = useState<UserDrawerState | null>(null);
  const [error, setError] = useState("");

  const { data: tenants = [], isLoading: tenantsLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => api.getTenants(),
  });

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId) ?? null;

  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["platform-branches", selectedTenantId],
    queryFn: () => api.getPlatformBranches(selectedTenantId!),
    enabled: !!selectedTenantId,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["platform-users", selectedTenantId],
    queryFn: () => api.getPlatformUsers(selectedTenantId!),
    enabled: !!selectedTenantId,
  });

  const invalidateTenantData = (tenantId: string) => {
    queryClient.invalidateQueries({ queryKey: ["tenants"] });
    queryClient.invalidateQueries({ queryKey: ["platform-branches", tenantId] });
    queryClient.invalidateQueries({ queryKey: ["platform-users", tenantId] });
  };

  const createTenantMutation = useMutation({
    mutationFn: (data: CreateTenantRequest) => api.createTenant(data),
    onSuccess: (tenant) => {
      invalidateTenantData(tenant.id);
      setSelectedTenantId(tenant.id);
      setMobileShowDetail(true);
      setTenantDrawer(null);
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  const deactivateTenantMutation = useMutation({
    mutationFn: (tenantId: string) => api.deactivateTenant(tenantId),
    onSuccess: (_, tenantId) => {
      if (selectedTenantId === tenantId) {
        setSelectedTenantId(null);
        setMobileShowDetail(false);
      }
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
  });

  const createBranchMutation = useMutation({
    mutationFn: ({ tenantId, data }: { tenantId: string; data: CreatePlatformBranchRequest }) =>
      api.createPlatformBranch(tenantId, data),
    onSuccess: (_, { tenantId }) => {
      invalidateTenantData(tenantId);
      setBranchDrawer(null);
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  const deactivateBranchMutation = useMutation({
    mutationFn: ({ tenantId, branchId }: { tenantId: string; branchId: string }) =>
      api.deactivatePlatformBranch(tenantId, branchId),
    onSuccess: (_, { tenantId }) => {
      invalidateTenantData(tenantId);
      setBranchDrawer(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const createUserMutation = useMutation({
    mutationFn: ({ tenantId, data }: { tenantId: string; data: CreatePlatformUserRequest }) =>
      api.createPlatformUser(tenantId, data),
    onSuccess: (_, { tenantId }) => {
      invalidateTenantData(tenantId);
      setUserDrawer(null);
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  const deactivateUserMutation = useMutation({
    mutationFn: ({ tenantId, userId }: { tenantId: string; userId: string }) =>
      api.deactivatePlatformUser(tenantId, userId),
    onSuccess: (_, { tenantId }) => {
      invalidateTenantData(tenantId);
      setUserDrawer(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const activeBranches = branches.filter((b) => b.status === "ACTIVE");

  const pageBreadcrumbs = useMemo(() => {
    if (!selectedTenant) return null;
    return [
      {
        label: tLayout("tenants"),
        onClick: () => {
          setSelectedTenantId(null);
          setMobileShowDetail(false);
        },
      },
      { label: selectedTenant.name },
    ];
  }, [selectedTenant?.id, selectedTenant?.name, tLayout]);

  useSetPageBreadcrumbs(pageBreadcrumbs);

  function selectTenant(id: string) {
    setSelectedTenantId(id);
    setMobileShowDetail(true);
    setTab("branches");
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          !mobileShowDetail && (
            <button onClick={() => setTenantDrawer({ mode: "create" })} className={`${btnViolet} py-2.5 px-4`}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t("addTenant")}</span>
            </button>
          )
        }
      />

      <MissionStrip />

      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      <div className="grid lg:grid-cols-3 gap-4 min-w-0">
        <section className={cn("lg:col-span-1 min-w-0", mobileShowDetail && "hidden lg:block")}>
          <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2 px-0.5">
            {t("tenantsCount", { count: tenants.length })}
          </p>
          {tenantsLoading ? (
            <p className="text-sm text-[var(--text-tertiary)]">{tCommon("loading")}</p>
          ) : tenants.length === 0 ? (
            <EmptyState
              title={t("noTenantsTitle")}
              description={t("noTenantsDesc")}
              action={
                <button onClick={() => setTenantDrawer({ mode: "create" })} className={btnViolet}>
                  <Plus className="w-4 h-4" />
                  {t("addTenant")}
                </button>
              }
            />
          ) : (
            <div className="space-y-2">
              {tenants.map((tenant) => (
                <TenantCard
                  key={tenant.id}
                  tenant={tenant}
                  selected={selectedTenantId === tenant.id}
                  onSelect={() => selectTenant(tenant.id)}
                  onRemove={() => {
                    if (window.confirm(t("deactivateTenantConfirm", { name: tenant.name }))) {
                      deactivateTenantMutation.mutate(tenant.id);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </section>

        <section className={cn("lg:col-span-2 min-w-0", !mobileShowDetail && !selectedTenant && "hidden lg:block")}>
          {!selectedTenant ? (
            <Card>
              <EmptyState
                title={t("selectTenantTitle")}
                description={t("selectTenantDesc")}
                action={<Building2 className="w-10 h-10 mx-auto text-[var(--text-tertiary)]" />}
              />
            </Card>
          ) : (
            <Card padding={false}>
              <div className="px-4 py-3.5 border-b border-[var(--border)] flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-[var(--text-primary)] truncate">{selectedTenant.name}</h2>
                  <p className="text-xs text-[var(--text-secondary)] truncate">
                    {selectedTenant.slug} · {selectedTenant.status}
                  </p>
                </div>
                {tab === "branches" && (
                  <button
                    onClick={() => setBranchDrawer({ mode: "create" })}
                    className={`${btnViolet} py-2 px-3 text-sm shrink-0`}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">{t("addBranch")}</span>
                  </button>
                )}
                {tab === "employees" && (
                  <button
                    onClick={() => setUserDrawer({ mode: "create" })}
                    className={`${btnViolet} py-2 px-3 text-sm shrink-0`}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span className="hidden sm:inline">{t("onboard")}</span>
                  </button>
                )}
              </div>

              <div className="p-4">
                <SegmentedControl
                  options={[
                    { id: "branches" as Tab, label: t("tabs.branches"), icon: Building2 },
                    { id: "employees" as Tab, label: t("tabs.employees"), icon: Users },
                  ]}
                  value={tab}
                  onChange={setTab}
                />
              </div>

              <div className="px-4 pb-4">
                {tab === "branches" ? (
                  <BranchesList
                    branches={branches}
                    loading={branchesLoading}
                    selectedId={branchDrawer && branchDrawer.mode === "view" ? branchDrawer.branch.id : null}
                    onSelect={(branch) => setBranchDrawer({ mode: "view", branch })}
                  />
                ) : (
                  <UsersList
                    users={users}
                    loading={usersLoading}
                    selectedId={userDrawer && userDrawer.mode === "view" ? userDrawer.user.id : null}
                    onSelect={(user) => setUserDrawer({ mode: "view", user })}
                  />
                )}
              </div>
            </Card>
          )}
        </section>
      </div>

      <TenantDrawer
        drawer={tenantDrawer}
        loading={createTenantMutation.isPending}
        error={createTenantMutation.error?.message}
        onClose={() => setTenantDrawer(null)}
        onCreate={(data) => createTenantMutation.mutate(data)}
      />

      {selectedTenant && (
        <>
          <PlatformBranchDrawer
            drawer={branchDrawer}
            loading={createBranchMutation.isPending}
            onClose={() => setBranchDrawer(null)}
            onCreate={(data) => createBranchMutation.mutate({ tenantId: selectedTenant.id, data })}
            onDeactivate={() => {
              if (branchDrawer && branchDrawer.mode === "view" && window.confirm(t("deactivateBranchConfirm", { name: branchDrawer.branch.name }))) {
                deactivateBranchMutation.mutate({ tenantId: selectedTenant.id, branchId: branchDrawer.branch.id });
              }
            }}
          />

          <PlatformUserDrawer
            drawer={userDrawer}
            branches={activeBranches}
            loading={createUserMutation.isPending}
            onClose={() => setUserDrawer(null)}
            onCreate={(data) => createUserMutation.mutate({ tenantId: selectedTenant.id, data })}
            onDeactivate={() => {
              if (userDrawer && userDrawer.mode === "view" && userDrawer.user.active &&
                window.confirm(t("deactivateUserConfirm", { name: userDrawer.user.name, email: userDrawer.user.email }))) {
                deactivateUserMutation.mutate({ tenantId: selectedTenant.id, userId: userDrawer.user.id });
              }
            }}
          />
        </>
      )}
    </div>
  );
}

function TenantCard({
  tenant,
  selected,
  onSelect,
  onRemove,
}: {
  tenant: Tenant;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full bg-[var(--surface)] rounded-2xl border p-4 flex items-center gap-3 text-left transition active:scale-[0.98]",
        selected ? "border-violet-400 ring-2 ring-violet-100" : "border-[var(--border)] hover:border-[var(--border-strong)]"
      )}
    >
      <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
        <span className="font-bold text-violet-700">{tenant.name[0]}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate text-sm">{tenant.name}</p>
        <p className="text-xs text-[var(--text-secondary)] truncate">{tenant.slug}</p>
      </div>
      <StatusBadge
        status={tenant.status === "ACTIVE" ? "APPROVED" : "PENDING"}
        className={tenant.status === "ACTIVE" ? "!bg-emerald-50 !text-emerald-700 !border-emerald-200" : ""}
      />
      {tenant.status === "ACTIVE" && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), onRemove())}
          className="p-1.5 text-[var(--text-tertiary)] hover:text-red-600 hover:bg-red-50 rounded-lg"
        >
          <Trash2 className="w-4 h-4" />
        </span>
      )}
      <ChevronRight className={cn("w-4 h-4 text-[var(--text-tertiary)] shrink-0", selected && "text-violet-500")} />
    </button>
  );
}

function BranchesList({
  branches,
  loading,
  selectedId,
  onSelect,
}: {
  branches: PlatformBranch[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (branch: PlatformBranch) => void;
}) {
  const t = useTranslations("platform.admin");
  if (loading) return <p className="text-sm text-[var(--text-tertiary)] mt-4">{t("loadingBranches")}</p>;
  if (branches.length === 0) return <div className="mt-4"><EmptyState title={t("noBranchesTitle")} /></div>;

  const activeCount = branches.filter((b) => b.status === "ACTIVE").length;

  return (
    <Card padding={false} className="mt-4">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <p className="text-xs text-[var(--text-tertiary)]">
          {t("activeTapDetails", { count: activeCount })}
        </p>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {branches.map((branch) => (
          <ListRow
            key={branch.id}
            title={branch.name}
            subtitle={`${branch.code}${branch.societyDefault ? ` · ${branch.societyDefault}` : ""}`}
            onClick={() => onSelect(branch)}
            trailing={
              <div className="flex items-center gap-2">
                <StatusBadge
                  status={branch.status === "ACTIVE" ? "APPROVED" : "PENDING"}
                  className={branch.status === "ACTIVE" ? "!bg-emerald-50 !text-emerald-700 !border-emerald-200" : ""}
                />
                <ChevronRight className={cn("w-4 h-4", selectedId === branch.id ? "text-violet-600" : "text-[var(--text-tertiary)]")} />
              </div>
            }
          />
        ))}
      </div>
    </Card>
  );
}

function UsersList({
  users,
  loading,
  selectedId,
  onSelect,
}: {
  users: PlatformUser[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (user: PlatformUser) => void;
}) {
  const t = useTranslations("platform.admin");
  if (loading) return <p className="text-sm text-[var(--text-tertiary)] mt-4">{t("loadingEmployees")}</p>;
  if (users.length === 0) return <div className="mt-4"><EmptyState title={t("noEmployeesTitle")} /></div>;

  const activeCount = users.filter((u) => u.active).length;

  return (
    <Card padding={false} className="mt-4">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <p className="text-xs text-[var(--text-tertiary)]">
          {t("activeTapDetails", { count: activeCount })}
        </p>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {users.map((user) => (
          <ListRow
            key={user.id}
            title={user.name}
            subtitle={`${user.email} · ${t(`roles.${user.role}`)}${user.branchName ? ` · ${user.branchName}` : ""}`}
            onClick={() => onSelect(user)}
            trailing={
              <div className="flex items-center gap-2">
                {!user.active && <StatusBadge status="CANCELLED" />}
                <ChevronRight className={cn("w-4 h-4", selectedId === user.id ? "text-violet-600" : "text-[var(--text-tertiary)]")} />
              </div>
            }
          />
        ))}
      </div>
    </Card>
  );
}

function TenantDrawer({
  drawer,
  loading,
  error,
  onClose,
  onCreate,
}: {
  drawer: TenantDrawerState | null;
  loading: boolean;
  error?: string;
  onClose: () => void;
  onCreate: (data: CreateTenantRequest) => void;
}) {
  const t = useTranslations("platform.admin");
  const tCommon = useTranslations("common");
  const [form, setForm] = useState<CreateTenantRequest>({
    name: "",
    slug: "",
    primaryColor: "#6366f1",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });

  if (!drawer) return null;

  return (
    <SideSheet
      open
      onClose={onClose}
      title={t("newTenant")}
      subtitle={t("newTenantSubtitle")}
      wide
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onCreate(form);
        }}
        className="space-y-4 pb-2"
      >
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={t("brandName")}>
            <input className={inputClass} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label={t("slug")}>
            <input
              className={inputClass}
              required
              placeholder={t("slugPlaceholder")}
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
            />
          </Field>
          <Field label={t("ceoName")}>
            <input className={inputClass} required value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} />
          </Field>
          <Field label={t("ceoEmail")}>
            <input className={inputClass} type="email" required value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} />
          </Field>
          <Field label={t("ceoPassword")}>
            <input className={inputClass} type="password" required minLength={6} value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} />
          </Field>
          <Field label={t("brandColor")}>
            <input className={inputClass} type="color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} />
          </Field>
        </div>
        {error && <AlertBanner variant="error">{error}</AlertBanner>}
        <div className="flex gap-2 pt-4 border-t border-[var(--border)]">
          <button type="button" onClick={onClose} className={`${btnSecondary} flex-1`}>{tCommon("cancel")}</button>
          <button type="submit" disabled={loading} className={`${btnViolet} flex-1`}>
            {loading ? t("creating") : t("createTenant")}
          </button>
        </div>
      </form>
    </SideSheet>
  );
}

function PlatformBranchDrawer({
  drawer,
  loading,
  onClose,
  onCreate,
  onDeactivate,
}: {
  drawer: BranchDrawerState | null;
  loading: boolean;
  onClose: () => void;
  onCreate: (data: CreatePlatformBranchRequest) => void;
  onDeactivate: () => void;
}) {
  const t = useTranslations("platform.admin");
  const tCommon = useTranslations("common");
  const tOrg = useTranslations("admin.organization");
  const [form, setForm] = useState<CreatePlatformBranchRequest>({
    name: "",
    code: "",
    address: "",
    societyDefault: "",
    phone: "",
  });

  if (!drawer) return null;

  const isView = drawer.mode === "view";
  const branch = isView ? drawer.branch : null;

  return (
    <SideSheet
      open
      onClose={onClose}
      title={isView ? branch!.name : t("newBranch")}
      subtitle={isView ? `${branch!.code}${branch!.societyDefault ? ` · ${branch!.societyDefault}` : ""}` : t("newBranchSubtitle")}
      wide
      footer={
        isView && branch!.status === "ACTIVE" ? (
          <button onClick={onDeactivate} className={`${btnSecondary} w-full text-red-600 border-red-200 hover:bg-red-50`}>
            <Trash2 className="w-4 h-4" />
            {t("deactivateBranch")}
          </button>
        ) : undefined
      }
    >
      {isView && branch ? (
        <div className="space-y-5">
          <SectionTitle>{t("branchSection")}</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <DetailField label={t("code")} value={branch.code} />
            <DetailField label={tCommon("status")} value={branch.status} />
            <DetailField label={tOrg("address")} value={branch.address} />
            <DetailField label={t("defaultSociety")} value={branch.societyDefault} />
            <DetailField label={tCommon("phone")} value={branch.phone} />
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onCreate(form);
          }}
          className="space-y-4 pb-2"
        >
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t("branchName")}>
              <input className={inputClass} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label={t("code")}>
              <input
                className={inputClass}
                required
                placeholder={t("codePlaceholder")}
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, "") })}
              />
            </Field>
            <Field label={tOrg("address")}>
              <input className={inputClass} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
            <Field label={t("defaultSociety")}>
              <input className={inputClass} value={form.societyDefault} onChange={(e) => setForm({ ...form, societyDefault: e.target.value })} />
            </Field>
            <Field label={tCommon("phone")}>
              <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
          </div>
          <div className="flex gap-2 pt-4 border-t border-[var(--border)]">
            <button type="button" onClick={onClose} className={`${btnSecondary} flex-1`}>{tCommon("cancel")}</button>
            <button type="submit" disabled={loading} className={`${btnViolet} flex-1`}>
              {loading ? t("adding") : t("addBranch")}
            </button>
          </div>
        </form>
      )}
    </SideSheet>
  );
}

function PlatformUserDrawer({
  drawer,
  branches,
  loading,
  onClose,
  onCreate,
  onDeactivate,
}: {
  drawer: UserDrawerState | null;
  branches: PlatformBranch[];
  loading: boolean;
  onClose: () => void;
  onCreate: (data: CreatePlatformUserRequest) => void;
  onDeactivate: () => void;
}) {
  const t = useTranslations("platform.admin");
  const tCommon = useTranslations("common");
  const tAdmin = useTranslations("admin.common");
  const [form, setForm] = useState<CreatePlatformUserRequest>({
    name: "",
    email: "",
    password: "",
    role: "BRANCH_MANAGER",
    branchId: "",
  });

  if (!drawer) return null;

  const isView = drawer.mode === "view";
  const user = isView ? drawer.user : null;
  const needsBranch = form.role === "BRANCH_MANAGER" || form.role === "SALON_MANAGER";

  return (
    <SideSheet
      open
      onClose={onClose}
      title={isView ? user!.name : t("onboardEmployee")}
      subtitle={isView ? `${user!.email} · ${t(`roles.${user!.role}`)}` : t("onboardSubtitle")}
      wide
      footer={
        isView && user!.active ? (
          <button onClick={onDeactivate} className={`${btnSecondary} w-full text-red-600 border-red-200 hover:bg-red-50`}>
            <Trash2 className="w-4 h-4" />
            {t("deactivateAccount")}
          </button>
        ) : undefined
      }
    >
      {isView && user ? (
        <div className="space-y-5">
          <SectionTitle>{tAdmin("account")}</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <DetailField label={tCommon("email")} value={user.email} />
            <DetailField label={t("role")} value={t(`roles.${user.role}`)} />
            <DetailField label={tCommon("branch")} value={user.branchName} />
            <DetailField label={tCommon("status")} value={user.active ? tCommon("active") : tCommon("inactive")} />
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onCreate({ ...form, branchId: needsBranch ? form.branchId : undefined });
          }}
          className="space-y-4 pb-2"
        >
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t("fullName")}>
              <input className={inputClass} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label={tCommon("email")}>
              <input className={inputClass} type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label={t("password")}>
              <input className={inputClass} type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            <Field label={t("role")}>
              <select
                className={selectClass}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserRole, branchId: "" })}
              >
                {ONBOARD_ROLES.map((role) => (
                  <option key={role} value={role}>{t(`roles.${role}`)}</option>
                ))}
              </select>
            </Field>
            {needsBranch && (
              <Field label={tCommon("branch")}>
                <select
                  className={selectClass}
                  required
                  value={form.branchId}
                  onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                >
                  <option value="">{t("selectBranch")}</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </Field>
            )}
          </div>
          {needsBranch && branches.length === 0 && (
            <AlertBanner variant="warning">{t("noBranchWarning")}</AlertBanner>
          )}
          <div className="flex gap-2 pt-4 border-t border-[var(--border)]">
            <button type="button" onClick={onClose} className={`${btnSecondary} flex-1`}>{tCommon("cancel")}</button>
            <button type="submit" disabled={loading || (needsBranch && branches.length === 0)} className={`${btnViolet} flex-1`}>
              {loading ? t("onboarding") : t("onboardEmployeeBtn")}
            </button>
          </div>
        </form>
      )}
    </SideSheet>
  );
}
