"use client";

import { Branch, PlatformBranch, UserRole } from "@/lib/api";
import { ProductDateRange } from "@/lib/date-range";
import { ScopeFilterBar } from "@/components/ScopeFilterBar";
import { DateRangeSelector } from "@/components/DateRangeSelector";
import { inputClass, selectClass } from "@/components/ui";
import { cn } from "@/lib/utils";

type Props = {
  dateRange: ProductDateRange;
  onDateRangeChange: (range: ProductDateRange) => void;
  branches?: PlatformBranch[] | Branch[];
  branchId: string;
  onBranchIdChange: (id: string) => void;
  userId: string;
  onUserIdChange: (id: string) => void;
  users?: { id: string; name: string }[];
  role: string;
  onRoleChange: (role: string) => void;
  search: string;
  onSearchChange: (q: string) => void;
  showBranch?: boolean;
  showUser?: boolean;
  showRole?: boolean;
  className?: string;
};

const ROLES: UserRole[] = [
  "BRAND_ADMIN",
  "BRANCH_MANAGER",
  "SALON_MANAGER",
  "SALON_STAFF",
];

export function PlatformUsageFilterBar({
  dateRange,
  onDateRangeChange,
  branches = [],
  branchId,
  onBranchIdChange,
  userId,
  onUserIdChange,
  users = [],
  role,
  onRoleChange,
  search,
  onSearchChange,
  showBranch = true,
  showUser = true,
  showRole = true,
  className,
}: Props) {
  return (
    <div className={cn("space-y-3", className)}>
      <ScopeFilterBar
        layout="card"
        className="max-w-full w-full"
        showBranch={false}
        dateControl={
          <DateRangeSelector
            value={dateRange}
            onChange={onDateRangeChange}
            testId="platform-usage-date-range"
          />
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
        {showBranch && (
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Branch</span>
            <select
              className={selectClass}
              value={branchId}
              onChange={(e) => onBranchIdChange(e.target.value)}
            >
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </label>
        )}
        {showUser && users.length > 0 && (
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--text-secondary)]">User</span>
            <select className={selectClass} value={userId} onChange={(e) => onUserIdChange(e.target.value)}>
              <option value="">All users</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {showRole && (
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Role</span>
            <select className={selectClass} value={role} onChange={(e) => onRoleChange(e.target.value)}>
              <option value="">All roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block space-y-1 sm:col-span-2 xl:col-span-1">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Search users</span>
          <input
            className={inputClass}
            placeholder="Name or email"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
