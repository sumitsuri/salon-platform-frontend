import {
  clearStoredAuth,
  getStoredUser,
  isAccessTokenExpired,
  patchStoredUser,
  redirectToLogin,
  syncAuthStore,
} from "./auth-session";

function resolveApiBase(): string {
  if (typeof window !== "undefined") {
    const configured = process.env.NEXT_PUBLIC_API_URL || "";
    // Production is served behind nginx on the same host — never call localhost from a remote origin.
    if (
      configured &&
      (configured.includes("localhost") || configured.includes("127.0.0.1")) &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      return "";
    }
    return configured;
  }
  return (
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8080"
  );
}

function apiBase(): string {
  return resolveApiBase();
}

export type UserRole = "PLATFORM_SUPER_ADMIN" | "BRAND_ADMIN" | "BRANCH_MANAGER" | "SALON_MANAGER";

export interface AuthUser {
  accessToken: string;
  refreshToken: string;
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId?: string;
  branchId?: string;
  tenantName?: string;
  branchName?: string;
  primaryColor?: string;
  logoUrl?: string;
  preferredLocale?: string | null;
}

interface ApiWrapper<T> {
  success: boolean;
  message?: string;
  data: T;
}

function getToken(): string | null {
  return getStoredUser()?.accessToken ?? null;
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const user = getStoredUser();
    if (!user?.refreshToken) return null;

    const res = await fetch(`${apiBase()}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: user.refreshToken }),
    });

    const text = await res.text();
    let body: ApiWrapper<AuthUser> = { success: false, data: undefined as unknown as AuthUser };
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        return null;
      }
    }

    if (!res.ok || !body.data?.accessToken) return null;

    const updated = patchStoredUser({
      accessToken: body.data.accessToken,
      refreshToken: body.data.refreshToken ?? user.refreshToken,
    });
    if (updated) await syncAuthStore(updated);
    return body.data.accessToken;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

async function handleSessionExpired() {
  clearStoredAuth();
  await syncAuthStore(null);
  redirectToLogin(true);
}

async function request<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  if (typeof document !== "undefined") {
    const localeMatch = document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]*)/);
    const locale = localeMatch ? decodeURIComponent(localeMatch[1]) : "en-IN";
    headers["Accept-Language"] = locale;
  }

  const res = await fetch(`${apiBase()}${path}`, { ...options, headers });
  const text = await res.text();

  let body: ApiWrapper<T> & { message?: string } = { success: false, data: undefined as T };
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error(res.ok ? "Invalid server response" : `Request failed (${res.status})`);
    }
  }

  if (res.status === 401 && !path.startsWith("/api/v1/auth/")) {
    if (!retried) {
      const newToken = await refreshAccessToken();
      if (newToken) return request<T>(path, options, true);
    }
    await handleSessionExpired();
    throw new Error("Session expired. Please sign in again.");
  }

  if (!res.ok) {
    throw new Error(body.message || `Request failed (${res.status})`);
  }
  return body.data;
}

async function multipartRequest<T>(path: string, formData: FormData, retried = false): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (typeof document !== "undefined") {
    const localeMatch = document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]*)/);
    const locale = localeMatch ? decodeURIComponent(localeMatch[1]) : "en-IN";
    headers["Accept-Language"] = locale;
  }

  const res = await fetch(`${apiBase()}${path}`, { method: "POST", headers, body: formData });
  const text = await res.text();
  let body: ApiWrapper<T> & { message?: string } = { success: false, data: undefined as T };
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error(res.ok ? "Invalid server response" : `Request failed (${res.status})`);
    }
  }

  if (res.status === 401 && !path.startsWith("/api/v1/auth/")) {
    if (!retried) {
      const newToken = await refreshAccessToken();
      if (newToken) return multipartRequest<T>(path, formData, true);
    }
    await handleSessionExpired();
    throw new Error("Session expired. Please sign in again.");
  }

  if (!res.ok) {
    throw new Error(body.message || `Request failed (${res.status})`);
  }
  return body.data;
}

export async function fetchAttendancePhotoBlob(recordId: string, type: "entry" | "exit" = "entry"): Promise<string> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${apiBase()}/api/v1/attendance/${recordId}/photo?type=${type}`, { headers });
  if (!res.ok) throw new Error("Photo unavailable");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/** Refresh access token if expired or near expiry. Call on app load. */
export async function ensureValidSession(): Promise<boolean> {
  const user = getStoredUser();
  if (!user?.accessToken || !user.refreshToken) return false;
  if (!isAccessTokenExpired(user.accessToken)) return true;
  const token = await refreshAccessToken();
  return token != null;
}

export const api = {
  login: (email: string, password: string) =>
    request<AuthUser>("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  me: () => request<AuthUser>("/api/v1/auth/me"),

  getLocales: () => request<LocaleInfo[]>("/api/v1/meta/locales"),

  updateLocale: (locale: string) =>
    request<AuthUser>("/api/v1/users/me/locale", {
      method: "PATCH",
      body: JSON.stringify({ locale }),
    }),

  searchCustomers: (q: string) =>
    request<Customer[]>(`/api/v1/customers/search?q=${encodeURIComponent(q)}`),

  findCustomerByPhone: (phone: string) =>
    request<Customer>(`/api/v1/customers/phone/${encodeURIComponent(phone)}`),

  createCustomer: (data: CreateCustomerRequest) =>
    request<Customer>("/api/v1/customers", { method: "POST", body: JSON.stringify(data) }),

  getBranchServices: (branchId: string) =>
    request<BranchServiceItem[]>(`/api/v1/catalog/branches/${branchId}/services`),

  getStaff: (branchId: string) =>
    request<StaffItem[]>(`/api/v1/staff?branchId=${branchId}`),

  createBooking: (data: CreateBookingRequest) =>
    request<Booking>("/api/v1/bookings", { method: "POST", body: JSON.stringify(data) }),

  getBookings: (params?: BookingListParams) => {
    const search = new URLSearchParams();
    if (params?.branchId) search.set("branchId", params.branchId);
    if (params?.customer) search.set("customer", params.customer);
    if (params?.branch) search.set("branch", params.branch);
    if (params?.service) search.set("service", params.service);
    if (params?.stylist) search.set("stylist", params.stylist);
    if (params?.status) search.set("status", params.status);
    if (params?.minAmount != null) search.set("minAmount", String(params.minAmount));
    if (params?.maxAmount != null) search.set("maxAmount", String(params.maxAmount));
    if (params?.dateFrom) search.set("dateFrom", params.dateFrom);
    if (params?.dateTo) search.set("dateTo", params.dateTo);
    search.set("page", String(params?.page ?? 0));
    search.set("size", String(params?.size ?? 20));
    return request<PageResult<Booking>>(`/api/v1/bookings?${search.toString()}`);
  },

  getEnquiries: (params?: EnquiryListParams) => {
    const search = new URLSearchParams();
    if (params?.name) search.set("name", params.name);
    if (params?.society) search.set("society", params.society);
    if (params?.email) search.set("email", params.email);
    if (params?.mobile) search.set("mobile", params.mobile);
    if (params?.message) search.set("message", params.message);
    if (params?.dateFrom) search.set("dateFrom", params.dateFrom);
    if (params?.dateTo) search.set("dateTo", params.dateTo);
    search.set("page", String(params?.page ?? 0));
    search.set("size", String(params?.size ?? 20));
    return request<PageResult<Lead>>(`/api/v1/enquiries?${search.toString()}`);
  },

  getCampaigns: () => request<Campaign[]>("/api/v1/campaigns"),

  previewCampaign: (data: CreateCampaignRequest) =>
    request<CampaignPreview>("/api/v1/campaigns/preview", { method: "POST", body: JSON.stringify(data) }),

  createCampaign: (data: CreateCampaignRequest) =>
    request<Campaign>("/api/v1/campaigns", { method: "POST", body: JSON.stringify(data) }),

  sendCampaign: (id: string) =>
    request<Campaign>(`/api/v1/campaigns/${id}/send`, { method: "POST" }),

  payBooking: (id: string, data: PaymentRequest) =>
    request<Booking>(`/api/v1/bookings/${id}/payments`, { method: "POST", body: JSON.stringify(data) }),

  getDashboard: (opts?: { startDate?: string; endDate?: string; branchIds?: string[] }) => {
    const params = new URLSearchParams();
    if (opts?.startDate) params.set("startDate", opts.startDate);
    if (opts?.endDate) params.set("endDate", opts.endDate);
    opts?.branchIds?.forEach((id) => params.append("branchIds", id));
    const q = params.toString() ? `?${params.toString()}` : "";
    return request<Dashboard>(`/api/v1/analytics/dashboard${q}`);
  },

  getRecommendations: (opts?: { startDate?: string; endDate?: string; branchIds?: string[] }) => {
    const params = new URLSearchParams();
    if (opts?.startDate) params.set("startDate", opts.startDate);
    if (opts?.endDate) params.set("endDate", opts.endDate);
    opts?.branchIds?.forEach((id) => params.append("branchIds", id));
    const q = params.toString() ? `?${params.toString()}` : "";
    return request<RecommendationsResponse>(`/api/v1/analytics/recommendations${q}`);
  },

  getServiceContribution: (opts?: {
    startDate?: string;
    endDate?: string;
    branchIds?: string[];
    serviceName?: string;
    page?: number;
    size?: number;
  }) => {
    const params = new URLSearchParams();
    if (opts?.startDate) params.set("startDate", opts.startDate);
    if (opts?.endDate) params.set("endDate", opts.endDate);
    opts?.branchIds?.forEach((id) => params.append("branchIds", id));
    if (opts?.serviceName) params.set("serviceName", opts.serviceName);
    params.set("page", String(opts?.page ?? 0));
    params.set("size", String(opts?.size ?? 20));
    const q = params.toString() ? `?${params.toString()}` : "";
    return request<ServiceContributionResponse>(`/api/v1/analytics/services${q}`);
  },

  getAttendanceDashboard: (opts?: { startDate?: string; endDate?: string; branchIds?: string[] }) => {
    const params = new URLSearchParams();
    if (opts?.startDate) params.set("startDate", opts.startDate);
    if (opts?.endDate) params.set("endDate", opts.endDate);
    opts?.branchIds?.forEach((id) => params.append("branchIds", id));
    const q = params.toString() ? `?${params.toString()}` : "";
    return request<AttendanceDashboard>(`/api/v1/analytics/attendance${q}`);
  },

  biometricPunch: (biometricId: string) =>
    request<PunchResult>("/api/v1/attendance/biometric/punch", {
      method: "POST",
      body: JSON.stringify({ biometricId }),
    }),

  verifiedPunch: (data: VerifiedPunchRequest, photo: Blob) => {
    const form = new FormData();
    form.append("staffId", data.staffId);
    if (data.action) form.append("action", data.action);
    if (data.latitude != null) form.append("latitude", String(data.latitude));
    if (data.longitude != null) form.append("longitude", String(data.longitude));
    if (data.accuracyMeters != null) form.append("accuracyMeters", String(data.accuracyMeters));
    form.append("photo", photo, "punch.jpg");
    return multipartRequest<PunchResult>("/api/v1/attendance/verified/punch", form);
  },

  manualAttendance: (data: ManualAttendanceRequest) =>
    request<AttendanceRecord>("/api/v1/attendance/manual", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getAttendance: (params?: {
    branchId?: string;
    staffId?: string;
    staff?: string;
    branch?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    size?: number;
  }) => {
    const search = new URLSearchParams();
    if (params?.branchId) search.set("branchId", params.branchId);
    if (params?.staffId) search.set("staffId", params.staffId);
    if (params?.staff) search.set("staff", params.staff);
    if (params?.branch) search.set("branch", params.branch);
    if (params?.status) search.set("status", params.status);
    if (params?.startDate) search.set("startDate", params.startDate);
    if (params?.endDate) search.set("endDate", params.endDate);
    search.set("page", String(params?.page ?? 0));
    search.set("size", String(params?.size ?? 20));
    const q = search.toString() ? `?${search.toString()}` : "";
    return request<PageResult<AttendanceRecord>>(`/api/v1/attendance${q}`);
  },

  resetAttendanceData: () =>
    request<{ deletedRecords: number }>("/api/v1/attendance/reset", { method: "DELETE" }),

  getBranch: (branchId: string) => request<Branch>(`/api/v1/branches/${branchId}`),

  getTodayAttendance: (branchId: string) =>
    request<AttendanceRecord[]>(`/api/v1/attendance/today?branchId=${branchId}`),

  createLeave: (data: CreateLeaveRequest) =>
    request<LeaveRecord>("/api/v1/leave", { method: "POST", body: JSON.stringify(data) }),

  getLeaves: (params?: {
    branchId?: string;
    staff?: string;
    branch?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    size?: number;
  }) => {
    const search = new URLSearchParams();
    if (params?.branchId) search.set("branchId", params.branchId);
    if (params?.staff) search.set("staff", params.staff);
    if (params?.branch) search.set("branch", params.branch);
    if (params?.status) search.set("status", params.status);
    if (params?.startDate) search.set("startDate", params.startDate);
    if (params?.endDate) search.set("endDate", params.endDate);
    search.set("page", String(params?.page ?? 0));
    search.set("size", String(params?.size ?? 20));
    const q = search.toString() ? `?${search.toString()}` : "";
    return request<PageResult<LeaveRecord>>(`/api/v1/leave${q}`);
  },

  approveLeave: (leaveId: string) =>
    request<LeaveRecord>(`/api/v1/leave/${leaveId}/approve`, { method: "POST" }),

  rejectLeave: (leaveId: string) =>
    request<LeaveRecord>(`/api/v1/leave/${leaveId}/reject`, { method: "POST" }),

  getBranches: () => request<Branch[]>("/api/v1/branches"),

  createBranch: (data: CreateBranchRequest) =>
    request<Branch>("/api/v1/branches", { method: "POST", body: JSON.stringify(data) }),

  updateBranch: (branchId: string, data: UpdateBranchRequest) =>
    request<Branch>(`/api/v1/branches/${branchId}`, { method: "PUT", body: JSON.stringify(data) }),

  deactivateBranch: (branchId: string) =>
    request<void>(`/api/v1/branches/${branchId}`, { method: "DELETE" }),

  updateBranchGeofence: (branchId: string, data: UpdateBranchGeofenceRequest) =>
    request<Branch>(`/api/v1/branches/${branchId}/geofence`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  createAttendanceIncident: (data: CreateAttendanceIncidentRequest) =>
    request<AttendanceIncident>("/api/v1/attendance/incidents", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getAttendanceIncidents: (staffId: string, page = 0, size = 20) => {
    const params = new URLSearchParams({
      staffId,
      page: String(page),
      size: String(size),
    });
    return request<PageResult<AttendanceIncident>>(`/api/v1/attendance/incidents?${params}`);
  },

  getBranchTargetPerformance: (opts?: { startDate?: string; endDate?: string; branchIds?: string[] }) => {
    const params = new URLSearchParams();
    if (opts?.startDate) params.set("startDate", opts.startDate);
    if (opts?.endDate) params.set("endDate", opts.endDate);
    opts?.branchIds?.forEach((id) => params.append("branchIds", id));
    const q = params.toString() ? `?${params.toString()}` : "";
    return request<BranchTargetPerformance>(`/api/v1/branches/performance/targets${q}`);
  },

  getBranchTargetTrends: (opts?: { startDate?: string; endDate?: string; branchIds?: string[] }) => {
    const params = new URLSearchParams();
    if (opts?.startDate) params.set("startDate", opts.startDate);
    if (opts?.endDate) params.set("endDate", opts.endDate);
    opts?.branchIds?.forEach((id) => params.append("branchIds", id));
    const q = params.toString() ? `?${params.toString()}` : "";
    return request<BranchTargetTrends>(`/api/v1/branches/performance/trends${q}`);
  },

  getTenant: () => request<Tenant>("/api/v1/tenant"),

  updateTenant: (data: UpdateTenantRequest) =>
    request<Tenant>("/api/v1/tenant", { method: "PUT", body: JSON.stringify(data) }),

  getBrandUsers: () => request<PlatformUser[]>("/api/v1/users"),

  createBrandUser: (data: CreatePlatformUserRequest) =>
    request<PlatformUser>("/api/v1/users", { method: "POST", body: JSON.stringify(data) }),

  updateBrandUser: (userId: string, data: UpdatePlatformUserRequest) =>
    request<PlatformUser>(`/api/v1/users/${userId}`, { method: "PUT", body: JSON.stringify(data) }),

  deactivateBrandUser: (userId: string) =>
    request<void>(`/api/v1/users/${userId}`, { method: "DELETE" }),

  getAllStaff: (branchId?: string) => {
    const params = new URLSearchParams({ all: "true" });
    if (branchId) params.set("branchId", branchId);
    return request<EmployeeDetail[]>(`/api/v1/staff?${params.toString()}`);
  },

  createEmployee: (data: CreateEmployeeRequest) =>
    request<EmployeeDetail>("/api/v1/staff", { method: "POST", body: JSON.stringify(data) }),

  updateEmployee: (staffId: string, data: UpdateEmployeeRequest) =>
    request<EmployeeDetail>(`/api/v1/staff/${staffId}`, { method: "PUT", body: JSON.stringify(data) }),

  deactivateEmployee: (staffId: string) =>
    request<void>(`/api/v1/staff/${staffId}`, { method: "DELETE" }),

  getStaffTargetPerformance: (opts?: { startDate?: string; endDate?: string; branchIds?: string[] }) => {
    const params = new URLSearchParams();
    if (opts?.startDate) params.set("startDate", opts.startDate);
    if (opts?.endDate) params.set("endDate", opts.endDate);
    opts?.branchIds?.forEach((id) => params.append("branchIds", id));
    const q = params.toString() ? `?${params.toString()}` : "";
    return request<StaffTargetPerformance>(`/api/v1/staff/performance/targets${q}`);
  },

  getStaffTargetTrends: (opts?: { startDate?: string; endDate?: string; branchIds?: string[] }) => {
    const params = new URLSearchParams();
    if (opts?.startDate) params.set("startDate", opts.startDate);
    if (opts?.endDate) params.set("endDate", opts.endDate);
    opts?.branchIds?.forEach((id) => params.append("branchIds", id));
    const q = params.toString() ? `?${params.toString()}` : "";
    return request<StaffTargetTrends>(`/api/v1/staff/performance/trends${q}`);
  },

  getPlSummary: (opts?: { startDate?: string; endDate?: string; branchIds?: string[] }) => {
    const params = new URLSearchParams();
    if (opts?.startDate) params.set("startDate", opts.startDate);
    if (opts?.endDate) params.set("endDate", opts.endDate);
    opts?.branchIds?.forEach((id) => params.append("branchIds", id));
    const q = params.toString() ? `?${params.toString()}` : "";
    return request<PlSummaryResponse>(`/api/v1/analytics/pl${q}`);
  },

  getPlTrends: (opts?: { endMonth?: string; months?: number; branchIds?: string[] }) => {
    const params = new URLSearchParams();
    if (opts?.endMonth) params.set("endMonth", opts.endMonth);
    if (opts?.months != null) params.set("months", String(opts.months));
    opts?.branchIds?.forEach((id) => params.append("branchIds", id));
    const q = params.toString() ? `?${params.toString()}` : "";
    return request<PlTrendsResponse>(`/api/v1/analytics/pl/trends${q}`);
  },

  getExpenditures: (opts?: { branchId?: string; fromMonth?: string; toMonth?: string }) => {
    const params = new URLSearchParams();
    if (opts?.branchId) params.set("branchId", opts.branchId);
    if (opts?.fromMonth) params.set("fromMonth", opts.fromMonth);
    if (opts?.toMonth) params.set("toMonth", opts.toMonth);
    const q = params.toString() ? `?${params.toString()}` : "";
    return request<ExpenditureItem[]>(`/api/v1/expenditures${q}`);
  },

  createExpenditure: (data: CreateExpenditureRequest) =>
    request<ExpenditureItem>("/api/v1/expenditures", { method: "POST", body: JSON.stringify(data) }),

  updateExpenditure: (id: string, data: UpdateExpenditureRequest) =>
    request<ExpenditureItem>(`/api/v1/expenditures/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deactivateExpenditure: (id: string) =>
    request<void>(`/api/v1/expenditures/${id}`, { method: "DELETE" }),

  syncPayrollExpenditures: (expenseMonth: string) =>
    request<ExpenditureItem[]>(`/api/v1/expenditures/sync-payroll?expenseMonth=${expenseMonth}`, {
      method: "POST",
    }),

  getInventoryVendors: () => request<VendorItem[]>("/api/v1/inventory/vendors"),
  createInventoryVendor: (data: CreateVendorRequest) =>
    request<VendorItem>("/api/v1/inventory/vendors", { method: "POST", body: JSON.stringify(data) }),
  updateInventoryVendor: (id: string, data: UpdateVendorRequest) =>
    request<VendorItem>(`/api/v1/inventory/vendors/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deactivateInventoryVendor: (id: string) =>
    request<void>(`/api/v1/inventory/vendors/${id}`, { method: "DELETE" }),

  getInventoryProducts: () => request<InventoryProductItem[]>("/api/v1/inventory/products"),
  createInventoryProduct: (data: CreateInventoryProductRequest) =>
    request<InventoryProductItem>("/api/v1/inventory/products", { method: "POST", body: JSON.stringify(data) }),
  updateInventoryProduct: (id: string, data: UpdateInventoryProductRequest) =>
    request<InventoryProductItem>(`/api/v1/inventory/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deactivateInventoryProduct: (id: string) =>
    request<void>(`/api/v1/inventory/products/${id}`, { method: "DELETE" }),

  getInventoryStock: (branchId?: string) => {
    const q = branchId ? `?branchId=${branchId}` : "";
    return request<StockItem[]>(`/api/v1/inventory/stock${q}`);
  },

  getInventoryMovements: (opts?: { branchId?: string; fromDate?: string; toDate?: string }) => {
    const params = new URLSearchParams();
    if (opts?.branchId) params.set("branchId", opts.branchId);
    if (opts?.fromDate) params.set("fromDate", opts.fromDate);
    if (opts?.toDate) params.set("toDate", opts.toDate);
    const q = params.toString() ? `?${params.toString()}` : "";
    return request<InventoryMovementItem[]>(`/api/v1/inventory/movements${q}`);
  },

  createInventoryMovement: (data: CreateInventoryMovementRequest) =>
    request<InventoryMovementItem>("/api/v1/inventory/movements", { method: "POST", body: JSON.stringify(data) }),

  getInventoryOverview: (opts?: { month?: string; branchIds?: string[] }) => {
    const params = new URLSearchParams();
    if (opts?.month) params.set("month", opts.month);
    opts?.branchIds?.forEach((id) => params.append("branchIds", id));
    const q = params.toString() ? `?${params.toString()}` : "";
    return request<InventoryOverview>(`/api/v1/inventory/analytics/overview${q}`);
  },

  getInventoryTrends: (opts?: { endMonth?: string; months?: number; branchIds?: string[] }) => {
    const params = new URLSearchParams();
    if (opts?.endMonth) params.set("endMonth", opts.endMonth);
    if (opts?.months != null) params.set("months", String(opts.months));
    opts?.branchIds?.forEach((id) => params.append("branchIds", id));
    const q = params.toString() ? `?${params.toString()}` : "";
    return request<InventoryTrendsResponse>(`/api/v1/inventory/analytics/trends${q}`);
  },

  getInvoices: () => request<Invoice[]>("/api/v1/invoices"),

  getInvoicePdfUrl: (invoiceId: string) => `${apiBase()}/api/v1/invoices/${invoiceId}/pdf`,

  getTenants: () => request<Tenant[]>("/api/v1/platform/tenants"),

  createTenant: (data: CreateTenantRequest) =>
    request<Tenant>("/api/v1/platform/tenants", { method: "POST", body: JSON.stringify(data) }),

  deactivateTenant: (tenantId: string) =>
    request<void>(`/api/v1/platform/tenants/${tenantId}`, { method: "DELETE" }),

  getPlatformBranches: (tenantId: string) =>
    request<PlatformBranch[]>(`/api/v1/platform/tenants/${tenantId}/branches`),

  createPlatformBranch: (tenantId: string, data: CreatePlatformBranchRequest) =>
    request<PlatformBranch>(`/api/v1/platform/tenants/${tenantId}/branches`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deactivatePlatformBranch: (tenantId: string, branchId: string) =>
    request<void>(`/api/v1/platform/tenants/${tenantId}/branches/${branchId}`, { method: "DELETE" }),

  getPlatformUsers: (tenantId: string) =>
    request<PlatformUser[]>(`/api/v1/platform/tenants/${tenantId}/users`),

  createPlatformUser: (tenantId: string, data: CreatePlatformUserRequest) =>
    request<PlatformUser>(`/api/v1/platform/tenants/${tenantId}/users`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deactivatePlatformUser: (tenantId: string, userId: string) =>
    request<void>(`/api/v1/platform/tenants/${tenantId}/users/${userId}`, { method: "DELETE" }),
};

export interface Customer {
  id: string;
  name: string;
  phone: string;
  society?: string;
  flatUnit?: string;
  visitCount: number;
  lifetimeSpend: number;
  lastVisitAt?: string;
}

export interface CreateCustomerRequest {
  name: string;
  phone: string;
  society?: string;
  flatUnit?: string;
}

export interface BranchServiceItem {
  id: string;
  branchId: string;
  serviceId: string;
  serviceName: string;
  categoryName: string;
  price: number;
  gstRate: number;
}

export interface StaffItem {
  id: string;
  name: string;
  branchId: string;
  biometricId?: string;
}

export type StaffRole = "STYLIST" | "BRANCH_MANAGER" | "SALON_MANAGER";

/** Full employee record — sensitive fields only returned for CEO (BRAND_ADMIN) */
export interface EmployeeDetail {
  id: string;
  name: string;
  phone?: string;
  branchId: string;
  branchName?: string;
  role: StaffRole;
  skills?: string;
  biometricId?: string;
  active: boolean;
  salary?: number;
  joiningDate?: string;
  idProofCollected?: boolean;
  idProofReference?: string;
  monthlySalesTarget?: number;
  incentivePercent?: number;
}

export interface CreateEmployeeRequest {
  name: string;
  phone?: string;
  branchId: string;
  role?: StaffRole;
  skills?: string;
  biometricId?: string;
  salary?: number;
  joiningDate?: string;
  idProofCollected?: boolean;
  idProofReference?: string;
  monthlySalesTarget?: number;
  incentivePercent?: number;
}

export interface UpdateEmployeeRequest {
  name?: string;
  phone?: string;
  branchId?: string;
  role?: StaffRole;
  skills?: string;
  biometricId?: string;
  salary?: number;
  joiningDate?: string;
  idProofCollected?: boolean;
  idProofReference?: string;
  monthlySalesTarget?: number;
  incentivePercent?: number;
  active?: boolean;
}

export interface StaffTargetPerformanceItem {
  staffId: string;
  staffName: string;
  branchId: string;
  branchName: string;
  monthlySalesTarget: number;
  actualSales: number;
  achievementPercent: number;
  meetingTarget: boolean;
  onTrack: boolean;
  incentivePercent: number;
  projectedIncentive: number;
}

export interface StaffTargetPerformance {
  periodLabel: string;
  meetingTargetCount: number;
  belowTargetCount: number;
  staff: StaffTargetPerformanceItem[];
}

export interface StaffTargetTrendPoint {
  date: string;
  actualCumulative: number;
  idealCumulative: number;
  gap: number;
}

export interface StaffTargetTrend {
  staffId: string;
  staffName: string;
  branchId: string;
  branchName: string;
  monthlySalesTarget: number;
  points: StaffTargetTrendPoint[];
  actualChangePct: number | null;
  gapChangePct: number | null;
}

export interface BranchStaffTargetTrends {
  branchId: string;
  branchName: string;
  staff: StaffTargetTrend[];
}

export interface StaffTargetTrends {
  periodLabel: string;
  branches: BranchStaffTargetTrends[];
}

export interface BookingListParams {
  branchId?: string;
  customer?: string;
  branch?: string;
  service?: string;
  stylist?: string;
  status?: string;
  minAmount?: number;
  maxAmount?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  size?: number;
}

export interface PageResult<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface EnquiryListParams {
  name?: string;
  society?: string;
  email?: string;
  mobile?: string;
  message?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  size?: number;
}

export interface LocaleInfo {
  code: string;
  label: string;
  nativeLabel: string;
  stateCode?: string;
  stateName?: string;
  stateNameNative?: string;
  regionGroup?: string;
  sortOrder?: number;
}

export interface Lead {
  id: string;
  name: string;
  society?: string;
  email: string;
  mobile: string;
  message: string;
  createdAt: string;
}

export type CampaignChannel = "WHATSAPP" | "SMS";
export type CampaignStatus = "DRAFT" | "SENDING" | "COMPLETED" | "FAILED";

export interface CreateCampaignRequest {
  name: string;
  channel: CampaignChannel;
  messageText: string;
  filterName?: string;
  filterSociety?: string;
  filterPhone?: string;
  filterMinVisitCount?: number;
  filterMaxVisitCount?: number;
  filterMinLifetimeSpend?: number;
  filterMaxLifetimeSpend?: number;
  filterLastVisitFrom?: string;
  filterLastVisitTo?: string;
  filterWhatsappOptInOnly?: boolean;
  filterSmsOptInOnly?: boolean;
}

export interface CampaignPreview {
  matchingCustomers: number;
}

export interface Campaign {
  id: string;
  name: string;
  channel: CampaignChannel;
  status: CampaignStatus;
  messageText: string;
  filterName?: string;
  filterSociety?: string;
  filterPhone?: string;
  filterMinVisitCount?: number;
  filterMaxVisitCount?: number;
  filterMinLifetimeSpend?: number;
  filterMaxLifetimeSpend?: number;
  filterLastVisitFrom?: string;
  filterLastVisitTo?: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  sentAt?: string;
  createdAt: string;
}

export interface BookingLine {
  id: string;
  branchServiceId: string;
  staffId: string;
  staffName: string;
  serviceName: string;
  unitPrice: number;
  quantity: number;
}

export interface BillPreview {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  grandTotal: number;
}

export interface Booking {
  id: string;
  branchId: string;
  branchName: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  status: string;
  lines: BookingLine[];
  billPreview?: BillPreview;
  invoiceId?: string;
  receiptQueued?: boolean;
  createdAt: string;
}

export interface CreateBookingRequest {
  branchId: string;
  customerId: string;
  lines: { branchServiceId: string; staffId: string; quantity: number }[];
  billDiscountType?: string;
  billDiscountValue?: number;
}

export interface PaymentRequest {
  mode: "CASH" | "UPI" | "CARD" | "SPLIT";
  amount: number;
  reference?: string;
  splits?: { mode: string; amount: number; reference?: string }[];
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address?: string;
  societyDefault?: string;
  gstin?: string;
  phone?: string;
  openTime?: string;
  closeTime?: string;
  latitude?: number;
  longitude?: number;
  geofenceRadiusMeters?: number;
  attendanceGraceMinutes?: number;
  monthlySalesTarget?: number;
  status?: string;
  createdAt?: string;
}

export interface CreateBranchRequest {
  name: string;
  code: string;
  address?: string;
  societyDefault?: string;
  gstin?: string;
  phone?: string;
  openTime?: string;
  closeTime?: string;
  monthlySalesTarget?: number;
  status?: string;
}

export interface UpdateBranchRequest {
  name?: string;
  code?: string;
  address?: string;
  societyDefault?: string;
  gstin?: string;
  phone?: string;
  openTime?: string;
  closeTime?: string;
  monthlySalesTarget?: number;
  status?: string;
}

export interface BranchTargetPerformanceItem {
  branchId: string;
  branchName: string;
  monthlySalesTarget: number;
  actualSales: number;
  achievementPercent: number;
  meetingTarget: boolean;
  onTrack: boolean;
}

export interface BranchTargetPerformance {
  periodLabel: string;
  meetingTargetCount: number;
  belowTargetCount: number;
  branches: BranchTargetPerformanceItem[];
}

export interface BranchTargetTrendPoint {
  date: string;
  actualCumulative: number;
  idealCumulative: number;
  gap: number;
}

export interface BranchTargetTrend {
  branchId: string;
  branchName: string;
  monthlySalesTarget: number;
  points: BranchTargetTrendPoint[];
  actualChangePct: number | null;
  gapChangePct: number | null;
}

export interface BranchTargetTrends {
  periodLabel: string;
  branches: BranchTargetTrend[];
}

export interface UpdateTenantRequest {
  name?: string;
  logoUrl?: string;
  primaryColor?: string;
}

export interface UpdatePlatformUserRequest {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  branchId?: string;
  active?: boolean;
}

export interface TrendPoint {
  date: string;
  revenue: number;
  visits: number;
  avgTicket: number;
  discounts: number;
}

export interface BranchTrend {
  branchId: string;
  branchName: string;
  points: TrendPoint[];
  revenueChangePct: number | null;
  visitsChangePct: number | null;
  avgTicketChangePct: number | null;
  discountsChangePct: number | null;
}

export interface Dashboard {
  totalRevenue: number;
  totalVisits: number;
  avgTicketSize: number;
  totalDiscounts: number;
  branchStats: { branchId: string; branchName: string; revenue: number; visits: number; avgTicket: number }[];
  branchTrends: BranchTrend[];
  topServices: { serviceName: string; revenue: number; count: number }[];
  topStaff: { staffId: string; staffName: string; branchName: string; revenue: number }[];
  paymentMix: { cash: number; upi: number; card: number };
}

export interface Recommendation {
  id: string;
  category: string;
  severity: "HIGH" | "MEDIUM" | "LOW" | "INFO";
  title: string;
  message: string;
  branchId?: string;
  branchName?: string;
  metricLabel?: string;
  metricValue?: string;
}

export interface BranchRecommendations {
  branchId: string;
  branchName: string;
  items: Recommendation[];
}

export interface RecommendationsResponse {
  brandWide: Recommendation[];
  branches: BranchRecommendations[];
  weekdayInsights?: WeekdaySalesInsight[];
}

export interface DayOfWeekStat {
  day: string;
  dayLabel: string;
  revenue: number;
  visits: number;
  avgRevenuePerDay: number;
  vsWeeklyAvgPct: number;
  slowDay: boolean;
}

export interface SlowDayAction {
  day: string;
  dayLabel: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  headline: string;
  insight: string;
  metricLabel?: string;
  metricValue?: string;
  actions: string[];
}

export interface WeekdaySalesInsight {
  branchId: string;
  branchName: string;
  dayStats: DayOfWeekStat[];
  slowDayActions: SlowDayAction[];
}

export interface ServiceContributionItem {
  serviceName: string;
  revenue: number;
  count: number;
  revenueSharePct: number;
  countSharePct: number;
}

export interface ServiceContributionResponse {
  totalRevenue: number;
  serviceRevenue: number;
  totalServiceCount: number;
  services: ServiceContributionItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export type GeoStatus = "IN_GEOFENCE" | "OUT_OF_GEOFENCE" | "GPS_UNAVAILABLE";
export type AttendanceMethod = "BIOMETRIC" | "MANUAL" | "VERIFIED";
export type IncidentType = "NOTE" | "PENALTY" | "IMPROVEMENT";

export interface AttendanceRecord {
  id: string;
  staffId: string;
  staffName: string;
  branchId: string;
  branchName: string;
  workDate: string;
  entryTime?: string;
  exitTime?: string;
  entryMethod?: AttendanceMethod;
  exitMethod?: AttendanceMethod;
  manualReason?: string;
  hoursWorked?: number;
  status: string;
  entryGeoStatus?: GeoStatus;
  exitGeoStatus?: GeoStatus;
  entryVerified?: boolean;
  exitVerified?: boolean;
  hasEntryPhoto?: boolean;
  hasExitPhoto?: boolean;
  late?: boolean;
  earlyExit?: boolean;
  lateMinutes?: number | null;
  earlyExitMinutes?: number | null;
  complianceFlags?: string[];
  branchLatitude?: number | null;
  branchLongitude?: number | null;
  geofenceRadiusMeters?: number | null;
  entryLatitude?: number | null;
  entryLongitude?: number | null;
  exitLatitude?: number | null;
  exitLongitude?: number | null;
  entryDistanceMeters?: number | null;
  exitDistanceMeters?: number | null;
}

export interface PunchResult {
  action: "CHECK_IN" | "CHECK_OUT";
  record: AttendanceRecord;
  message: string;
}

export interface VerifiedPunchRequest {
  staffId: string;
  action?: "CHECK_IN" | "CHECK_OUT";
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
}

export interface ManualAttendanceRequest {
  staffId: string;
  workDate: string;
  entryTime?: string;
  exitTime?: string;
  reason?: string;
}

export interface LeaveRecord {
  id: string;
  staffId: string;
  staffName: string;
  branchId: string;
  branchName: string;
  startDate: string;
  endDate: string;
  leaveType: "FULL_DAY" | "HALF_DAY";
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason?: string;
  createdAt?: string;
}

export interface CreateLeaveRequest {
  staffId: string;
  startDate: string;
  endDate: string;
  leaveType?: "FULL_DAY" | "HALF_DAY";
  reason?: string;
}

export interface AttendanceIncident {
  id: string;
  staffId: string;
  staffName: string;
  branchId: string;
  attendanceRecordId?: string;
  workDate?: string;
  type: IncidentType;
  note: string;
  penaltyAmount?: number;
  createdByUserId?: string;
  createdAt?: string;
}

export interface CreateAttendanceIncidentRequest {
  staffId: string;
  attendanceRecordId?: string;
  workDate?: string;
  type: IncidentType;
  note: string;
  penaltyAmount?: number;
}

export interface UpdateBranchGeofenceRequest {
  latitude: number;
  longitude: number;
  geofenceRadiusMeters?: number;
  attendanceGraceMinutes?: number;
}

export interface AttendanceDashboard {
  totalStaff: number;
  presentToday: number;
  onLeaveToday: number;
  absentToday: number;
  avgHoursPerStaff: number;
  dailyTrends: { date: string; presentCount: number; leaveCount: number; avgHours: number }[];
  staffSummaries: {
    staffId: string;
    staffName: string;
    branchName: string;
    daysPresent: number;
    daysLeave: number;
    totalHours: number;
    avgHoursPerDay: number;
    lateArrivals: number;
    earlyExits: number;
    geoFlags: number;
    performanceScore: number;
    complianceScore: number;
  }[];
  recentRecords: AttendanceRecord[];
  leaves: LeaveRecord[];
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  grandTotal: number;
  customerName: string;
  issuedAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  primaryColor?: string;
}

export interface CreateTenantRequest {
  name: string;
  slug: string;
  primaryColor?: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

export interface PlatformBranch {
  id: string;
  name: string;
  code: string;
  address?: string;
  societyDefault?: string;
  gstin?: string;
  phone?: string;
  status: string;
}

export interface CreatePlatformBranchRequest {
  name: string;
  code: string;
  address?: string;
  societyDefault?: string;
  gstin?: string;
  phone?: string;
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branchId?: string;
  branchName?: string;
  active: boolean;
}

export interface CreatePlatformUserRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  branchId?: string;
}

export type ExpenditureCategory =
  | "EMPLOYEE_SALARY"
  | "RENT"
  | "PRODUCT_COST"
  | "EMPLOYEE_ACCOMMODATION_RENT"
  | "MISCELLANEOUS";

export interface ExpenditureItem {
  id: string;
  branchId: string;
  branchName: string;
  category: ExpenditureCategory;
  expenseMonth: string;
  amount: number;
  description?: string;
  createdAt?: string;
}

export interface CreateExpenditureRequest {
  branchId: string;
  category: ExpenditureCategory;
  expenseMonth: string;
  amount: number;
  description?: string;
}

export interface UpdateExpenditureRequest {
  branchId?: string;
  category?: ExpenditureCategory;
  expenseMonth?: string;
  amount?: number;
  description?: string;
}

export interface PlCategoryAmount {
  category: ExpenditureCategory;
  amount: number;
}

export interface BranchPlSummary {
  branchId: string;
  branchName: string;
  revenue: number;
  expensesByCategory: PlCategoryAmount[];
  totalExpenses: number;
  netProfit: number;
  marginPercent: number;
}

export interface BrandPlSummary {
  revenue: number;
  expensesByCategory: PlCategoryAmount[];
  totalExpenses: number;
  netProfit: number;
  marginPercent: number;
}

export interface PlSummaryResponse {
  periodLabel: string;
  brand: BrandPlSummary;
  branches: BranchPlSummary[];
}

export interface PlTrendPoint {
  month: string;
  revenue: number;
  totalExpenses: number;
  netProfit: number;
  marginPercent: number;
}

export interface BranchPlTrend {
  branchId: string;
  branchName: string;
  points: PlTrendPoint[];
  revenueChangePct: number | null;
  expensesChangePct: number | null;
  netProfitChangePct: number | null;
  marginChangePct: number | null;
}

export interface PlTrendsResponse {
  periodLabel: string;
  branches: BranchPlTrend[];
}

export type ProductCategory = "CONSUMABLE" | "RETAIL" | "EQUIPMENT";
export type InventoryUnit = "ML" | "G" | "PCS" | "BOTTLE";
export type MovementType = "RESTOCK" | "USAGE" | "WASTAGE" | "RETAIL_SALE" | "ADJUSTMENT";

export interface VendorItem {
  id: string;
  name: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
}

export interface CreateVendorRequest {
  name: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
}

export interface UpdateVendorRequest {
  name?: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
}

export interface InventoryProductItem {
  id: string;
  vendorId: string;
  vendorName: string;
  name: string;
  sku?: string;
  category: ProductCategory;
  unit: InventoryUnit;
  unitCost: number;
  retailPrice?: number;
  reorderLevel?: number;
}

export interface CreateInventoryProductRequest {
  vendorId: string;
  name: string;
  sku?: string;
  category: ProductCategory;
  unit: InventoryUnit;
  unitCost: number;
  retailPrice?: number;
  reorderLevel?: number;
}

export interface UpdateInventoryProductRequest {
  vendorId?: string;
  name?: string;
  sku?: string;
  category?: ProductCategory;
  unit?: InventoryUnit;
  unitCost?: number;
  retailPrice?: number;
  reorderLevel?: number;
}

export interface StockItem {
  id: string;
  branchId: string;
  branchName: string;
  productId: string;
  productName: string;
  sku?: string;
  category: ProductCategory;
  unit: InventoryUnit;
  vendorId: string;
  vendorName: string;
  quantity: number;
  reorderLevel?: number;
  unitCost: number;
  stockValue: number;
  lowStock: boolean;
  outOfStock: boolean;
}

export interface InventoryMovementItem {
  id: string;
  branchId: string;
  branchName: string;
  productId: string;
  productName: string;
  sku?: string;
  vendorId?: string;
  vendorName?: string;
  movementType: MovementType;
  quantity: number;
  unitCost: number;
  totalCost: number;
  movementDate: string;
  note?: string;
  recordedByName?: string;
}

export interface CreateInventoryMovementRequest {
  branchId: string;
  productId: string;
  movementType: MovementType;
  quantity: number;
  unitCost?: number;
  movementDate: string;
  note?: string;
}

export interface BranchInventorySummary {
  branchId: string;
  branchName: string;
  productCost: number;
  stockValue: number;
  lowStockCount: number;
  movementCount: number;
}

export interface InventoryOverview {
  periodLabel: string;
  totalProductCost: number;
  totalStockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  topCostProductName?: string;
  topCostProductAmount: number;
  branches: BranchInventorySummary[];
}

export interface InventoryTrendPoint {
  month: string;
  productCost: number;
  stockValue: number;
  usageCost: number;
  wastageCost: number;
}

export interface BranchInventoryTrend {
  branchId: string;
  branchName: string;
  points: InventoryTrendPoint[];
  costChangePct: number | null;
}

export interface InventoryTrendsResponse {
  periodLabel: string;
  branches: BranchInventoryTrend[];
}
