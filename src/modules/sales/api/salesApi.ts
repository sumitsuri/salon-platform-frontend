import { authRequest } from "@/lib/api";
import { resolveClientApiBase, resolveServerApiBase } from "@/lib/client-api-base";

function apiBase(): string {
  if (typeof window !== "undefined") {
    return resolveClientApiBase();
  }
  return resolveServerApiBase();
}

interface ApiWrapper<T> {
  success: boolean;
  message?: string;
  data: T;
}

async function salesRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authRequest<T>(path, options);
}

async function publicSalesRequest<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data: ApiWrapper<T> = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || `Request failed: ${res.status}`);
  }
  return data.data;
}

export type LeadStage =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "PITCHED"
  | "INTERESTED"
  | "FREE_TRIAL"
  | "WON"
  | "LOST";

export type LeadType = "SHOP" | "BRAND" | "CHANNEL_PARTNER";
export type LeadSource = "FIELD" | "MARKETING_WEB" | "REFERRAL" | "INBOUND_CALL" | "OTHER";
export type ActivityType = "VISIT" | "CALL" | "EMAIL" | "WHATSAPP" | "NOTE" | "PITCH" | "DEMO";

export type BillingPeriod = "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY";

export interface SalesLead {
  id: string;
  businessName: string;
  contactName: string;
  email?: string;
  phone: string;
  leadType: LeadType;
  stage: LeadStage;
  source: LeadSource;
  localityId?: string;
  localityName?: string;
  address?: string;
  city?: string;
  expectedBranches: number;
  useCase?: string;
  notes?: string;
  assignedRepId?: string;
  assignedRepName?: string;
  convertedTenantId?: string;
  projectedMrr?: number;
  planTier?: string;
  quotedAmount?: number;
  billingPeriod?: BillingPeriod;
  discountPercent?: number;
  discountAmount?: number;
  finalPaidAmount?: number;
  lostReason?: string;
  trialIntentAt?: string;
  convertedAt?: string;
  nextFollowUpAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PageResult<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface SalesActivity {
  id: string;
  leadId: string;
  repId: string;
  repName?: string;
  activityType: ActivityType;
  notes?: string;
  activityAt?: string;
  createdAt?: string;
}

export interface SalesRep {
  id: string;
  name: string;
  email: string;
  active: boolean;
}

export interface SalesTarget {
  id?: string;
  repId: string;
  repName?: string;
  weekStartDate: string;
  targetLeads: number;
  targetVisits: number;
  targetPitches: number;
  targetTrials: number;
  targetConversions: number;
  actualLeads?: number;
  actualVisits?: number;
  actualPitches?: number;
  actualTrials?: number;
  actualConversions?: number;
}

export interface SalesLocality {
  id: string;
  name: string;
  zone?: string;
}

export interface PlatformOverview {
  totalCustomersAllTime: number;
  activeCustomers: number;
  trialCustomers: number;
  customersAcquiredInPeriod: number;
  freeTrialNotWon: number;
  totalRevenueWonAllTime: number;
  totalRevenueLostAllTime: number;
  periodSummary: PipelineSummary;
  repTrend: RepPerformance[];
}

export type CustomerMetricKey =
  | "total"
  | "active"
  | "trial"
  | "acquired"
  | "freeTrialNotWon";

export const CUSTOMER_METRIC_LABELS: Record<CustomerMetricKey, string> = {
  total: "Total customers (all time)",
  active: "Active customers",
  trial: "Trial customers",
  acquired: "New customers in period",
  freeTrialNotWon: "Free trials not won",
};

export interface PipelineSummary {
  totalLeads: number;
  wonCount: number;
  lostCount: number;
  freeTrialCount: number;
  otherCount: number;
  wonRevenue: number;
  lostRevenue: number;
}

export interface PipelineAnalytics {
  stageCounts: Record<string, number>;
  totalOpen: number;
  totalWon: number;
  totalLost: number;
}

export interface GrowthAnalytics {
  activeCustomers: number;
  trialCustomers: number;
  totalCustomers: number;
  pipelineMrr: number;
  wonMrr: number;
  customerTrend: { period: string; value: number; changePercent?: number }[];
  mrrTrend: { period: string; mrr: number; changePercent?: number }[];
}

export interface RepPerformance {
  repId: string;
  repName: string;
  leadsAdded: number;
  visits: number;
  pitches: number;
  trials: number;
  conversions: number;
  lost: number;
  revenueWon: number;
  incentiveEarned: number;
  targetAchievementPercent: number;
  underperforming: boolean;
}

export const STAGES: LeadStage[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PITCHED",
  "INTERESTED",
  "FREE_TRIAL",
  "WON",
  "LOST",
];

export const salesApi = {
  listLeads: (params?: Record<string, string | number | string[]>) => {
    const q = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === "") return;
        if (Array.isArray(v)) {
          v.forEach((item) => q.append(k, String(item)));
        } else {
          q.set(k, String(v));
        }
      });
    }
    const suffix = q.toString() ? `?${q}` : "";
    return salesRequest<PageResult<SalesLead>>(`/api/v1/platform/sales/leads${suffix}`);
  },

  getLead: (id: string) => salesRequest<SalesLead>(`/api/v1/platform/sales/leads/${id}`),

  createLead: (data: Partial<SalesLead>) =>
    salesRequest<SalesLead>("/api/v1/platform/sales/leads", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateLead: (id: string, data: Partial<SalesLead>) =>
    salesRequest<SalesLead>(`/api/v1/platform/sales/leads/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  listUseCases: () => salesRequest<string[]>("/api/v1/platform/sales/use-cases"),

  updateStage: (id: string, stage: LeadStage, notes?: string, lostReason?: string) =>
    salesRequest<SalesLead>(`/api/v1/platform/sales/leads/${id}/stage`, {
      method: "PATCH",
      body: JSON.stringify({ stage, notes, lostReason }),
    }),

  addActivity: (id: string, activityType: ActivityType, notes?: string) =>
    salesRequest<SalesActivity>(`/api/v1/platform/sales/leads/${id}/activities`, {
      method: "POST",
      body: JSON.stringify({ activityType, notes }),
    }),

  listActivities: (id: string) =>
    salesRequest<SalesActivity[]>(`/api/v1/platform/sales/leads/${id}/activities`),

  convertLead: (
    id: string,
    data: {
      tenantSlug: string;
      adminName: string;
      adminEmail: string;
      adminPassword: string;
      planTier?: string;
      projectedMrr: number;
    }
  ) =>
    salesRequest<SalesLead>(`/api/v1/platform/sales/leads/${id}/convert`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listLocalities: () => salesRequest<SalesLocality[]>("/api/v1/platform/sales/localities"),

  listReps: (includeInactive?: boolean) => {
    const q = includeInactive ? "?includeInactive=true" : "";
    return salesRequest<SalesRep[]>(`/api/v1/platform/sales/reps${q}`);
  },

  createRep: (data: { name: string; email: string; password: string }) =>
    salesRequest<SalesRep>("/api/v1/platform/sales/reps", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateRep: (
    id: string,
    data: { name?: string; email?: string; password?: string; active?: boolean }
  ) =>
    salesRequest<SalesRep>(`/api/v1/platform/sales/reps/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deactivateRep: (id: string) =>
    salesRequest<void>(`/api/v1/platform/sales/reps/${id}`, { method: "DELETE" }),

  listTargets: (weekStart?: string, range?: { from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (weekStart) q.set("weekStart", weekStart);
    if (range?.from) q.set("from", range.from);
    if (range?.to) q.set("to", range.to);
    const suffix = q.toString() ? `?${q}` : "";
    return salesRequest<SalesTarget[]>(`/api/v1/platform/sales/targets${suffix}`);
  },

  upsertTarget: (data: SalesTarget) =>
    salesRequest<SalesTarget>("/api/v1/platform/sales/targets", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  pipelineAnalytics: () =>
    salesRequest<PipelineAnalytics>("/api/v1/platform/sales/analytics/pipeline"),

  pipelineSummary: (params?: { from?: string; to?: string; assignedRepIds?: string[] }) => {
    const q = new URLSearchParams();
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    params?.assignedRepIds?.forEach((id) => q.append("assignedRepIds", id));
    const suffix = q.toString() ? `?${q}` : "";
    return salesRequest<PipelineSummary>(`/api/v1/platform/sales/analytics/summary${suffix}`);
  },

  platformOverview: (params?: { from?: string; to?: string; assignedRepIds?: string[] }) => {
    const q = new URLSearchParams();
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    params?.assignedRepIds?.forEach((id) => q.append("assignedRepIds", id));
    const suffix = q.toString() ? `?${q}` : "";
    return salesRequest<PlatformOverview>(`/api/v1/platform/sales/analytics/overview${suffix}`);
  },

  growthAnalytics: () => salesRequest<GrowthAnalytics>("/api/v1/platform/sales/analytics/growth"),

  repAnalytics: (params?: { weekStart?: string; from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (params?.weekStart) q.set("weekStart", params.weekStart);
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    const suffix = q.toString() ? `?${q}` : "";
    return salesRequest<RepPerformance[]>(`/api/v1/platform/sales/analytics/reps${suffix}`);
  },

  myAnalytics: (params?: { weekStart?: string; from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (params?.weekStart) q.set("weekStart", params.weekStart);
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    const suffix = q.toString() ? `?${q}` : "";
    return salesRequest<RepPerformance>(`/api/v1/platform/sales/analytics/me${suffix}`);
  },

  submitPublicLead: (data: {
    name?: string;
    businessName?: string;
    contactName?: string;
    email: string;
    phone: string;
    city?: string;
    branches?: string;
    notes?: string;
  }) => publicSalesRequest<SalesLead>("/api/v1/public/sales-leads", data),
};
