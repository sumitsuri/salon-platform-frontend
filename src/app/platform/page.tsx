"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Building2,
  ChevronRight,
  Plus,
  Trash2,
  UserPlus,
  Users,
  X,
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

type Tab = "branches" | "employees";

const ROLE_LABELS: Record<UserRole, string> = {
  PLATFORM_SUPER_ADMIN: "Platform Admin",
  BRAND_ADMIN: "Brand Admin (CEO)",
  BRANCH_MANAGER: "Branch Manager",
  SALON_MANAGER: "Salon Manager",
};

const ONBOARD_ROLES: UserRole[] = ["BRAND_ADMIN", "BRANCH_MANAGER", "SALON_MANAGER"];

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";

export default function PlatformPage() {
  const queryClient = useQueryClient();
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("branches");
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);

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
      setShowAddTenant(false);
    },
  });

  const deactivateTenantMutation = useMutation({
    mutationFn: (tenantId: string) => api.deactivateTenant(tenantId),
    onSuccess: (_, tenantId) => {
      if (selectedTenantId === tenantId) setSelectedTenantId(null);
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
  });

  const createBranchMutation = useMutation({
    mutationFn: ({ tenantId, data }: { tenantId: string; data: CreatePlatformBranchRequest }) =>
      api.createPlatformBranch(tenantId, data),
    onSuccess: (_, { tenantId }) => {
      invalidateTenantData(tenantId);
      setShowAddBranch(false);
    },
  });

  const deactivateBranchMutation = useMutation({
    mutationFn: ({ tenantId, branchId }: { tenantId: string; branchId: string }) =>
      api.deactivatePlatformBranch(tenantId, branchId),
    onSuccess: (_, { tenantId }) => invalidateTenantData(tenantId),
  });

  const createUserMutation = useMutation({
    mutationFn: ({ tenantId, data }: { tenantId: string; data: CreatePlatformUserRequest }) =>
      api.createPlatformUser(tenantId, data),
    onSuccess: (_, { tenantId }) => {
      invalidateTenantData(tenantId);
      setShowAddEmployee(false);
    },
  });

  const deactivateUserMutation = useMutation({
    mutationFn: ({ tenantId, userId }: { tenantId: string; userId: string }) =>
      api.deactivatePlatformUser(tenantId, userId),
    onSuccess: (_, { tenantId }) => invalidateTenantData(tenantId),
  });

  const activeBranches = branches.filter((b) => b.status === "ACTIVE");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Platform Admin</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage tenants, branches, and onboard employees with roles
          </p>
        </div>
        <button
          onClick={() => setShowAddTenant(true)}
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700"
        >
          <Plus className="w-4 h-4" />
          Add Tenant
        </button>
      </div>

      {showAddTenant && (
        <AddTenantForm
          onSubmit={(data) => createTenantMutation.mutate(data)}
          onCancel={() => setShowAddTenant(false)}
          loading={createTenantMutation.isPending}
          error={createTenantMutation.error?.message}
        />
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-1">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Tenants
          </h2>
          {tenantsLoading ? (
            <p className="text-sm text-slate-400">Loading...</p>
          ) : tenants.length === 0 ? (
            <p className="text-sm text-slate-400 bg-white rounded-xl p-6 border">
              No tenants yet. Add your first tenant to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {tenants.map((tenant) => (
                <TenantCard
                  key={tenant.id}
                  tenant={tenant}
                  selected={selectedTenantId === tenant.id}
                  onSelect={() => setSelectedTenantId(tenant.id)}
                  onRemove={() => {
                    if (
                      window.confirm(
                        `Deactivate "${tenant.name}"? All users will be deactivated.`
                      )
                    ) {
                      deactivateTenantMutation.mutate(tenant.id);
                    }
                  }}
                  removing={deactivateTenantMutation.isPending}
                />
              ))}
            </div>
          )}
        </section>

        <section className="lg:col-span-2">
          {!selectedTenant ? (
            <div className="bg-white rounded-2xl border p-12 text-center text-slate-400">
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Select a tenant to manage branches and employees</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border overflow-hidden">
              <div className="px-6 py-4 border-b bg-slate-50">
                <h2 className="font-bold text-lg">{selectedTenant.name}</h2>
                <p className="text-sm text-slate-500">
                  {selectedTenant.slug} · {selectedTenant.status}
                </p>
              </div>

              <div className="flex border-b">
                <TabButton
                  active={tab === "branches"}
                  onClick={() => setTab("branches")}
                  icon={<Building2 className="w-4 h-4" />}
                  label="Branches"
                  count={activeBranches.length}
                />
                <TabButton
                  active={tab === "employees"}
                  onClick={() => setTab("employees")}
                  icon={<Users className="w-4 h-4" />}
                  label="Employees"
                  count={users.filter((u) => u.active).length}
                />
              </div>

              <div className="p-6">
                {tab === "branches" ? (
                  <BranchesPanel
                    branches={branches}
                    loading={branchesLoading}
                    showAdd={showAddBranch}
                    onToggleAdd={() => setShowAddBranch((v) => !v)}
                    onAdd={(data) =>
                      createBranchMutation.mutate({ tenantId: selectedTenant.id, data })
                    }
                    onRemove={(branchId) => {
                      const branch = branches.find((b) => b.id === branchId);
                      if (
                        window.confirm(
                          `Deactivate branch "${branch?.name}"? Assigned managers will be deactivated.`
                        )
                      ) {
                        deactivateBranchMutation.mutate({
                          tenantId: selectedTenant.id,
                          branchId,
                        });
                      }
                    }}
                    addLoading={createBranchMutation.isPending}
                    addError={createBranchMutation.error?.message}
                  />
                ) : (
                  <EmployeesPanel
                    users={users}
                    branches={activeBranches}
                    loading={usersLoading}
                    showAdd={showAddEmployee}
                    onToggleAdd={() => setShowAddEmployee((v) => !v)}
                    onAdd={(data) =>
                      createUserMutation.mutate({ tenantId: selectedTenant.id, data })
                    }
                    onRemove={(userId) => {
                      const u = users.find((x) => x.id === userId);
                      if (window.confirm(`Deactivate "${u?.name}" (${u?.email})?`)) {
                        deactivateUserMutation.mutate({
                          tenantId: selectedTenant.id,
                          userId,
                        });
                      }
                    }}
                    addLoading={createUserMutation.isPending}
                    addError={createUserMutation.error?.message}
                  />
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors",
        active
          ? "border-violet-600 text-violet-700 bg-white"
          : "border-transparent text-slate-500 hover:text-slate-700"
      )}
    >
      {icon}
      {label}
      <span
        className={cn(
          "text-xs px-1.5 py-0.5 rounded-full",
          active ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"
        )}
      >
        {count}
      </span>
    </button>
  );
}

function TenantCard({
  tenant,
  selected,
  onSelect,
  onRemove,
  removing,
}: {
  tenant: Tenant;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  removing: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border p-4 flex items-center gap-3 cursor-pointer transition-all",
        selected ? "border-violet-400 ring-2 ring-violet-100" : "hover:border-slate-300"
      )}
      onClick={onSelect}
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{tenant.name}</p>
        <p className="text-xs text-slate-500">
          {tenant.slug} ·{" "}
          <span
            className={cn(
              tenant.status === "ACTIVE" ? "text-emerald-600" : "text-amber-600"
            )}
          >
            {tenant.status}
          </span>
        </p>
      </div>
      {tenant.status === "ACTIVE" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          disabled={removing}
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
          title="Deactivate tenant"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
      <ChevronRight
        className={cn("w-4 h-4 text-slate-300", selected && "text-violet-500")}
      />
    </div>
  );
}

function AddTenantForm({
  onSubmit,
  onCancel,
  loading,
  error,
}: {
  onSubmit: (data: CreateTenantRequest) => void;
  onCancel: () => void;
  loading: boolean;
  error?: string;
}) {
  const [form, setForm] = useState<CreateTenantRequest>({
    name: "",
    slug: "",
    primaryColor: "#6366f1",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">New Tenant</h3>
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>
      </div>
      <p className="text-sm text-slate-500">
        Creates the tenant and a Brand Admin (CEO) account for onboarding.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Brand Name">
          <input
            className={inputClass}
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Slug">
          <input
            className={inputClass}
            required
            placeholder="my-brand"
            value={form.slug}
            onChange={(e) =>
              setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })
            }
          />
        </Field>
        <Field label="CEO Name">
          <input
            className={inputClass}
            required
            value={form.adminName}
            onChange={(e) => setForm({ ...form, adminName: e.target.value })}
          />
        </Field>
        <Field label="CEO Email">
          <input
            className={inputClass}
            type="email"
            required
            value={form.adminEmail}
            onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
          />
        </Field>
        <Field label="CEO Password">
          <input
            className={inputClass}
            type="password"
            required
            minLength={6}
            value={form.adminPassword}
            onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
          />
        </Field>
        <Field label="Brand Color">
          <input
            className={inputClass}
            type="color"
            value={form.primaryColor}
            onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
          />
        </Field>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Tenant"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function BranchesPanel({
  branches,
  loading,
  showAdd,
  onToggleAdd,
  onAdd,
  onRemove,
  addLoading,
  addError,
}: {
  branches: PlatformBranch[];
  loading: boolean;
  showAdd: boolean;
  onToggleAdd: () => void;
  onAdd: (data: CreatePlatformBranchRequest) => void;
  onRemove: (branchId: string) => void;
  addLoading: boolean;
  addError?: string;
}) {
  const [form, setForm] = useState<CreatePlatformBranchRequest>({
    name: "",
    code: "",
    address: "",
    societyDefault: "",
    phone: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(form);
    setForm({ name: "", code: "", address: "", societyDefault: "", phone: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Add and manage salon branches for this tenant</p>
        <button
          onClick={onToggleAdd}
          className="flex items-center gap-1.5 text-sm font-medium text-violet-600 hover:text-violet-800"
        >
          <Plus className="w-4 h-4" />
          {showAdd ? "Cancel" : "Add Branch"}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-slate-50 rounded-xl p-4 space-y-3 border">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Branch Name">
              <input
                className={inputClass}
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Code">
              <input
                className={inputClass}
                required
                placeholder="LITHOS"
                value={form.code}
                onChange={(e) =>
                  setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, "") })
                }
              />
            </Field>
            <Field label="Address">
              <input
                className={inputClass}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </Field>
            <Field label="Default Society">
              <input
                className={inputClass}
                value={form.societyDefault}
                onChange={(e) => setForm({ ...form, societyDefault: e.target.value })}
              />
            </Field>
            <Field label="Phone">
              <input
                className={inputClass}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
          </div>
          {addError && <p className="text-sm text-red-600">{addError}</p>}
          <button
            type="submit"
            disabled={addLoading}
            className="bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
          >
            {addLoading ? "Adding..." : "Add Branch"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading branches...</p>
      ) : branches.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No branches yet</p>
      ) : (
        <div className="divide-y border rounded-xl overflow-hidden">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium">{branch.name}</p>
                <p className="text-xs text-slate-500">
                  {branch.code}
                  {branch.societyDefault ? ` · ${branch.societyDefault}` : ""}
                  {" · "}
                  <span
                    className={cn(
                      branch.status === "ACTIVE" ? "text-emerald-600" : "text-amber-600"
                    )}
                  >
                    {branch.status}
                  </span>
                </p>
              </div>
              {branch.status === "ACTIVE" && (
                <button
                  onClick={() => onRemove(branch.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  title="Deactivate branch"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmployeesPanel({
  users,
  branches,
  loading,
  showAdd,
  onToggleAdd,
  onAdd,
  onRemove,
  addLoading,
  addError,
}: {
  users: PlatformUser[];
  branches: PlatformBranch[];
  loading: boolean;
  showAdd: boolean;
  onToggleAdd: () => void;
  onAdd: (data: CreatePlatformUserRequest) => void;
  onRemove: (userId: string) => void;
  addLoading: boolean;
  addError?: string;
}) {
  const [form, setForm] = useState<CreatePlatformUserRequest>({
    name: "",
    email: "",
    password: "",
    role: "BRANCH_MANAGER",
    branchId: "",
  });

  const needsBranch =
    form.role === "BRANCH_MANAGER" || form.role === "SALON_MANAGER";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      ...form,
      branchId: needsBranch ? form.branchId : undefined,
    });
    setForm({ name: "", email: "", password: "", role: "BRANCH_MANAGER", branchId: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Onboard employees and assign roles (CEO, Branch Manager, Salon Manager)
        </p>
        <button
          onClick={onToggleAdd}
          className="flex items-center gap-1.5 text-sm font-medium text-violet-600 hover:text-violet-800"
        >
          <UserPlus className="w-4 h-4" />
          {showAdd ? "Cancel" : "Onboard Employee"}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-slate-50 rounded-xl p-4 space-y-3 border">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Full Name">
              <input
                className={inputClass}
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <input
                className={inputClass}
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Password">
              <input
                className={inputClass}
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </Field>
            <Field label="Role">
              <select
                className={inputClass}
                value={form.role}
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value as UserRole, branchId: "" })
                }
              >
                {ONBOARD_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </Field>
            {needsBranch && (
              <Field label="Branch">
                <select
                  className={inputClass}
                  required
                  value={form.branchId}
                  onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                >
                  <option value="">Select branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>
          {needsBranch && branches.length === 0 && (
            <p className="text-sm text-amber-600">
              Add at least one active branch before onboarding branch/salon managers.
            </p>
          )}
          {addError && <p className="text-sm text-red-600">{addError}</p>}
          <button
            type="submit"
            disabled={addLoading || (needsBranch && branches.length === 0)}
            className="bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
          >
            {addLoading ? "Onboarding..." : "Onboard Employee"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading employees...</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No employees yet</p>
      ) : (
        <div className="divide-y border rounded-xl overflow-hidden">
          {users.map((user) => (
            <div
              key={user.id}
              className={cn(
                "flex items-center gap-4 px-4 py-3",
                !user.active && "opacity-50 bg-slate-50"
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium">{user.name}</p>
                <p className="text-xs text-slate-500">
                  {user.email} · {ROLE_LABELS[user.role]}
                  {user.branchName ? ` · ${user.branchName}` : ""}
                  {!user.active && " · INACTIVE"}
                </p>
              </div>
              {user.active && (
                <button
                  onClick={() => onRemove(user.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  title="Deactivate user"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
