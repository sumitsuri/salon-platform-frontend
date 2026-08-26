import {
  clearStoredAuth,
  getStoredUser,
  isAccessTokenExpired,
  patchStoredUser,
  redirectToLogin,
  syncAuthStore,
} from "./auth-session";
import { deliverInvoicePdf } from "./invoice-pdf-client";
import { resolveClientApiBase, resolveServerApiBase } from "./client-api-base";

function resolveApiBase(): string {
  if (typeof window !== "undefined") {
    return resolveClientApiBase();
  }
  return resolveServerApiBase();
}

function apiBase(): string {
  return resolveApiBase();
}

export type UserRole =
  | "PLATFORM_SUPER_ADMIN"
  | "SALES_EXECUTIVE"
  | "BRAND_ADMIN"
  | "BRANCH_MANAGER"
  | "SALON_MANAGER";

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

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 45_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Request timed out. Check your connection and try again.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
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

  const res = await fetchWithTimeout(`${apiBase()}${path}`, { ...options, headers });
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

async function publicRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  const res = await fetchWithTimeout(`${apiBase()}${path}`, { ...options, headers });
  const text = await res.text();
  let body: ApiWrapper<T> & { message?: string } = { success: false, data: undefined as T };
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error(res.ok ? "Invalid server response" : `Request failed (${res.status})`);
    }
  }
  if (!res.ok || !body.success) {
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

  forgotPassword: (email: string) =>
    publicRequest<{ message: string }>("/api/v1/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    publicRequest<{ message: string }>("/api/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),

  me: () => request<AuthUser>("/api/v1/auth/me"),

  getLocales: () => request<LocaleInfo[]>("/api/v1/meta/locales"),
  getMessagingConfig: () => request<MessagingConfig>("/api/v1/meta/messaging"),

  updateLocale: (locale: string) =>
    request<AuthUser>("/api/v1/users/me/locale", {
      method: "PATCH",
      body: JSON.stringify({ locale }),
    }),

  searchCustomers: (q: string) =>
    request<Customer[]>(`/api/v1/customers/search?q=${encodeURIComponent(q)}`),

  findCustomerByPhone: (phone: string) =>
    request<Customer>(`/api/v1/customers/phone/${encodeURIComponent(phone)}`),

  findCustomerByVisitPass: (visitPassId: string) =>
    request<Customer>(`/api/v1/customers/visit-pass/${encodeURIComponent(visitPassId)}`),

  createCustomer: (data: CreateCustomerRequest) =>
    request<Customer>("/api/v1/customers", { method: "POST", body: JSON.stringify(data) }),

  updateCustomer: (id: string, data: UpdateCustomerRequest) =>
    request<Customer>(`/api/v1/customers/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  getCustomerRegistrationCard: (customerId: string, branchId?: string) => {
    const q = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
    return request<CustomerRegistrationCard>(`/api/v1/customers/${customerId}/registration-card${q}`);
  },

  getCustomer: (id: string) => request<Customer>(`/api/v1/customers/${id}`),

  listCustomers: (params?: CustomerListParams) => {
    const search = new URLSearchParams();
    if (params?.name) search.set("name", params.name);
    if (params?.society) search.set("society", params.society);
    if (params?.phone) search.set("phone", params.phone);
    if (params?.visitPassId) search.set("visitPassId", params.visitPassId);
    if (params?.minVisitCount != null) search.set("minVisitCount", String(params.minVisitCount));
    if (params?.maxVisitCount != null) search.set("maxVisitCount", String(params.maxVisitCount));
    if (params?.minLifetimeSpend != null) search.set("minLifetimeSpend", String(params.minLifetimeSpend));
    if (params?.maxLifetimeSpend != null) search.set("maxLifetimeSpend", String(params.maxLifetimeSpend));
    if (params?.lastVisitFrom) search.set("lastVisitFrom", params.lastVisitFrom);
    if (params?.lastVisitTo) search.set("lastVisitTo", params.lastVisitTo);
    search.set("page", String(params?.page ?? 0));
    search.set("size", String(params?.size ?? 20));
    return request<PageResult<Customer>>(`/api/v1/customers?${search.toString()}`);
  },

  getPublicPassCard: (token: string) =>
    publicRequest<CustomerRegistrationCard>(`/api/v1/public/pass/${encodeURIComponent(token)}`),

  getBranchServices: (branchId: string) =>
    request<BranchServiceItem[]>(`/api/v1/catalog/branches/${branchId}/services`),

  getBranchAvailability: (branchId: string, date?: string) => {
    const q = date ? `?date=${encodeURIComponent(date)}` : "";
    return request<BranchAvailability>(`/api/v1/branches/${branchId}/availability${q}`);
  },

  getCategories: (includeInactive = false) =>
    request<CatalogCategory[]>(
      `/api/v1/catalog/categories${includeInactive ? "?includeInactive=true" : ""}`
    ),

  createCategory: (data: { name: string; parentCategoryId?: string; sortOrder?: number }) =>
    request<CatalogCategory>("/api/v1/catalog/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateCategory: (
    id: string,
    data: {
      name?: string;
      parentCategoryId?: string;
      clearParent?: boolean;
      sortOrder?: number;
      active?: boolean;
    }
  ) =>
    request<CatalogCategory>(`/api/v1/catalog/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteCategory: (id: string) =>
    request<void>(`/api/v1/catalog/categories/${id}`, { method: "DELETE" }),

  getCatalogServices: (includeInactive = false) =>
    request<CatalogServiceItem[]>(
      `/api/v1/catalog/services${includeInactive ? "?includeInactive=true" : ""}`
    ),

  getCatalogService: (id: string) =>
    request<CatalogServiceItem>(`/api/v1/catalog/services/${id}`),

  createCatalogService: (data: {
    categoryId: string;
    name: string;
    description?: string;
    sacCode?: string;
    gstRate?: number;
    durationMinutes?: number;
  }) =>
    request<{ id: string }>("/api/v1/catalog/services", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateCatalogService: (
    id: string,
    data: {
      categoryId?: string;
      name?: string;
      description?: string;
      sacCode?: string;
      gstRate?: number;
      durationMinutes?: number;
      active?: boolean;
    }
  ) =>
    request<{ id: string }>(`/api/v1/catalog/services/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteCatalogService: (id: string) =>
    request<void>(`/api/v1/catalog/services/${id}`, { method: "DELETE" }),

  setCatalogServiceBranches: (
    serviceId: string,
    assignments: { branchId: string; price: number; displayNameOverride?: string; active?: boolean }[]
  ) =>
    request<CatalogServiceItem>(`/api/v1/catalog/services/${serviceId}/branches`, {
      method: "PUT",
      body: JSON.stringify({ assignments }),
    }),

  setBranchServicePricing: (
    branchId: string,
    data: { serviceId: string; price: number; displayNameOverride?: string }
  ) =>
    request(`/api/v1/catalog/branches/${branchId}/pricing`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  removeBranchServicePricing: (branchId: string, serviceId: string) =>
    request<void>(`/api/v1/catalog/branches/${branchId}/pricing/${serviceId}`, {
      method: "DELETE",
    }),

  getStaff: (branchId: string) =>
    request<StaffItem[]>(`/api/v1/staff?branchId=${branchId}`),

  createBooking: (data: CreateBookingRequest) =>
    request<Booking>("/api/v1/bookings", { method: "POST", body: JSON.stringify(data) }),

  getBooking: (id: string) => request<Booking>(`/api/v1/bookings/${id}`),

  updateBookingLines: (
    id: string,
    lines: { branchServiceId: string; staffId: string; quantity: number; unitPrice?: number }[]
  ) =>
    request<Booking>(`/api/v1/bookings/${id}/lines`, {
      method: "PUT",
      body: JSON.stringify({ lines }),
    }),

  markBookingReadyForBilling: (id: string) =>
    request<Booking>(`/api/v1/bookings/${id}/ready-for-billing`, { method: "POST" }),

  reopenBooking: (id: string) =>
    request<Booking>(`/api/v1/bookings/${id}/reopen`, { method: "POST" }),

  setPendingMembershipPlan: (id: string, planId: string | null) =>
    request<Booking>(`/api/v1/bookings/${id}/pending-membership`, {
      method: "POST",
      body: JSON.stringify({ planId }),
    }),

  getBookings: (params?: BookingListParams) => {
    const search = new URLSearchParams();
    if (params?.branchId) search.set("branchId", params.branchId);
    if (params?.customerId) search.set("customerId", params.customerId);
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

  getCampaigns: (params?: {
    name?: string;
    channel?: CampaignChannel;
    status?: CampaignStatus;
  }) => {
    const search = new URLSearchParams();
    if (params?.name) search.set("name", params.name);
    if (params?.channel) search.set("channel", params.channel);
    if (params?.status) search.set("status", params.status);
    const q = search.toString();
    return request<Campaign[]>(`/api/v1/campaigns${q ? `?${q}` : ""}`);
  },

  getCampaignDeliveries: (id: string) =>
    request<CampaignDelivery[]>(`/api/v1/campaigns/${id}/deliveries`),

  previewCampaign: (data: CreateCampaignRequest) =>
    request<CampaignPreview>("/api/v1/campaigns/preview", { method: "POST", body: JSON.stringify(data) }),

  createCampaign: (data: CreateCampaignRequest) =>
    request<Campaign>("/api/v1/campaigns", { method: "POST", body: JSON.stringify(data) }),

  sendCampaign: (id: string) =>
    request<Campaign>(`/api/v1/campaigns/${id}/send`, { method: "POST" }),

  getCoupons: () => request<Coupon[]>("/api/v1/promotions/coupons"),
  createCoupon: (data: CreateCouponRequest) =>
    request<Coupon>("/api/v1/promotions/coupons", { method: "POST", body: JSON.stringify(data) }),
  updateCouponStatus: (id: string, status: PromoStatus) =>
    request<Coupon>(`/api/v1/promotions/coupons/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  getOffers: () => request<Offer[]>("/api/v1/promotions/offers"),
  createOffer: (data: CreateOfferRequest) =>
    request<Offer>("/api/v1/promotions/offers", { method: "POST", body: JSON.stringify(data) }),
  updateOfferStatus: (id: string, status: PromoStatus) =>
    request<Offer>(`/api/v1/promotions/offers/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  getApplicablePromos: (branchId: string) =>
    request<ApplicablePromo[]>(`/api/v1/promotions/applicable?branchId=${branchId}`),

  getMembershipPlans: () => request<MembershipPlan[]>("/api/v1/memberships/plans"),
  getActiveMembershipPlans: () => request<MembershipPlan[]>("/api/v1/memberships/plans/active"),
  createMembershipPlan: (data: CreateMembershipPlanRequest) =>
    request<MembershipPlan>("/api/v1/memberships/plans", { method: "POST", body: JSON.stringify(data) }),
  updateMembershipPlanStatus: (id: string, status: PromoStatus) =>
    request<MembershipPlan>(`/api/v1/memberships/plans/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  sellMembership: (data: SellMembershipRequest) =>
    request<MembershipSubscription>("/api/v1/memberships/subscriptions", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getActiveMembership: (customerId: string) =>
    request<MembershipSubscription | null>(`/api/v1/memberships/customers/${customerId}/active`),
  listActiveMemberships: (params: MembershipListParams) => {
    const search = new URLSearchParams();
    if (params.branchId) search.set("branchId", params.branchId);
    if (params.q) search.set("q", params.q);
    if (params.phone) search.set("phone", params.phone);
    if (params.card) search.set("card", params.card);
    if (params.planId) search.set("planId", params.planId);
    if (params.endsBefore) search.set("endsBefore", params.endsBefore);
    if (params.endsAfter) search.set("endsAfter", params.endsAfter);
    if (params.page != null) search.set("page", String(params.page));
    if (params.size != null) search.set("size", String(params.size));
    return request<PageResult<MembershipSubscription>>(`/api/v1/memberships/subscriptions/active?${search}`);
  },

  applyBookingPromo: (id: string, data: { couponId?: string | null; offerId?: string | null; clearPromo?: boolean }) =>
    request<Booking>(`/api/v1/bookings/${id}/promotions`, { method: "POST", body: JSON.stringify(data) }),

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
    if (data.locationHighAccuracy != null) form.append("locationHighAccuracy", String(data.locationHighAccuracy));
    const file =
      photo instanceof File
        ? photo
        : new File([photo], "punch.jpg", { type: photo.type || "image/jpeg" });
    form.append("photo", file, "punch.jpg");
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

  bulkUpdateBranchOnlineBooking: (data: { enabled: boolean; branchIds?: string[] }) =>
    request<Branch[]>("/api/v1/branches/online-booking/bulk", { method: "PATCH", body: JSON.stringify(data) }),

  deactivateBranch: (branchId: string) =>
    request<void>(`/api/v1/branches/${branchId}`, { method: "DELETE" }),

  updateBranchGeofence: (branchId: string, data: UpdateBranchGeofenceRequest) =>
    request<Branch>(`/api/v1/branches/${branchId}/geofence`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  updateBranchDigitalPresence: (branchId: string, data: UpdateBranchDigitalPresenceRequest) =>
    request<Branch>(`/api/v1/branches/${branchId}/digital-presence`, {
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

  getBenchmark: (opts?: { startDate?: string; endDate?: string; branchIds?: string[] }) => {
    const params = new URLSearchParams();
    if (opts?.startDate) params.set("startDate", opts.startDate);
    if (opts?.endDate) params.set("endDate", opts.endDate);
    opts?.branchIds?.forEach((id) => params.append("branchIds", id));
    const q = params.toString() ? `?${params.toString()}` : "";
    return request<BenchmarkResponse>(`/api/v1/analytics/benchmark${q}`);
  },

  getBenchmarkSettings: () => request<BenchmarkSettings>("/api/v1/analytics/benchmark/settings"),

  updateBenchmarkSettings: (data: Partial<BenchmarkSettings>) =>
    request<BenchmarkSettings>("/api/v1/analytics/benchmark/settings", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  getLocalCompetitors: () => request<LocalCompetitorRow[]>("/api/v1/analytics/benchmark/local-competitors"),

  createLocalCompetitor: (data: UpsertLocalCompetitorRequest) =>
    request<LocalCompetitorRow>("/api/v1/analytics/benchmark/local-competitors", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateLocalCompetitor: (id: string, data: UpsertLocalCompetitorRequest) =>
    request<LocalCompetitorRow>(`/api/v1/analytics/benchmark/local-competitors/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteLocalCompetitor: (id: string) =>
    request<void>(`/api/v1/analytics/benchmark/local-competitors/${id}`, { method: "DELETE" }),

  getLocalSpotlight: (opts?: { branchIds?: string[]; radiusKm?: number; refresh?: boolean }) => {
    const params = new URLSearchParams();
    if (opts?.radiusKm != null) params.set("radiusKm", String(opts.radiusKm));
    if (opts?.refresh) params.set("refresh", "true");
    opts?.branchIds?.forEach((id) => params.append("branchIds", id));
    const q = params.toString() ? `?${params.toString()}` : "";
    return request<LocalSpotlightResponse>(`/api/v1/analytics/local-spotlight${q}`);
  },

  syncLocalSpotlight: (opts?: { radiusKm?: number; force?: boolean }) => {
    const params = new URLSearchParams();
    if (opts?.radiusKm != null) params.set("radiusKm", String(opts.radiusKm));
    if (opts?.force != null) params.set("force", String(opts.force));
    const q = params.toString() ? `?${params.toString()}` : "";
    return request<LocalSpotlightSyncResponse>(`/api/v1/analytics/local-spotlight/sync${q}`, { method: "POST" });
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

  getInvoiceByBooking: (bookingId: string) =>
    request<InvoiceDetail>(`/api/v1/invoices/booking/${bookingId}`),

  getInvoice: (invoiceId: string) => request<InvoiceDetail>(`/api/v1/invoices/${invoiceId}`),

  getInvoicePdfUrl: (invoiceId: string) => `${apiBase()}/api/v1/invoices/${invoiceId}/pdf`,

  fetchInvoicePdfBlob: async (invoiceId: string, filename?: string) => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    async function fetchPdf(authHeaders: Record<string, string>) {
      return fetch(`${apiBase()}/api/v1/invoices/${invoiceId}/pdf`, { headers: authHeaders });
    }

    let res = await fetchPdf(headers);
    if (res.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        headers.Authorization = `Bearer ${newToken}`;
        res = await fetchPdf(headers);
      } else {
        await handleSessionExpired();
        throw new Error("Session expired. Please sign in again.");
      }
    }
    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="?([^"]+)"?/i);
    return {
      blob,
      filename: filename || match?.[1] || `invoice-${invoiceId}.pdf`,
    };
  },

  downloadInvoicePdf: async (invoiceId: string, filename?: string) => {
    const { blob, filename: resolvedFilename } = await api.fetchInvoicePdfBlob(invoiceId, filename);
    return deliverInvoicePdf(blob, resolvedFilename, {
      action: "download",
      title: "Bill",
      text: "Your salon bill",
    });
  },

  shareInvoicePdf: async (invoiceId: string, filename?: string, shareText?: string) => {
    const { blob, filename: resolvedFilename } = await api.fetchInvoicePdfBlob(invoiceId, filename);
    return deliverInvoicePdf(blob, resolvedFilename, {
      action: "share",
      title: "Bill",
      text: shareText ?? "Your salon bill",
    });
  },

  applyBookingBillDiscount: (
    id: string,
    data: {
      billDiscountType?: "FLAT" | "PERCENT" | null;
      billDiscountValue?: number | null;
      billDiscountNote?: string | null;
      clearDiscount?: boolean;
    }
  ) =>
    request<Booking>(`/api/v1/bookings/${id}/bill-discount`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  cancelBooking: (id: string) =>
    request<void>(`/api/v1/bookings/${id}/cancel`, { method: "POST" }),

  checkInBooking: (id: string) =>
    request<void>(`/api/v1/bookings/${id}/check-in`, { method: "POST" }),

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

  getReviewInvitationByVisit: (visitId: string) =>
    request<ReviewInvitation>(`/api/v1/reviews/invitations/by-visit/${visitId}`),

  getGuestVoiceSummary: (opts: { from: string; to: string; branchIds?: string[] }) => {
    const params = new URLSearchParams();
    params.set("from", opts.from);
    params.set("to", opts.to);
    opts.branchIds?.forEach((id) => params.append("branchIds", id));
    return request<GuestVoiceSummary>(`/api/v1/reviews/guest-voice?${params.toString()}`);
  },

  getPublicReviewContext: (token: string) =>
    publicRequest<PublicReviewContext>(`/api/v1/public/reviews/context?token=${encodeURIComponent(token)}`),

  submitPublicReview: (data: SubmitPublicReviewPayload) =>
    publicRequest<SubmitPublicReviewResult>("/api/v1/public/reviews", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  visitPassId?: string;
  identityStatus?: "PHONE_VERIFIED" | "PASS_ONLY" | "UPGRADED";
  passPublicToken?: string;
  society?: string;
  flatUnit?: string;
  visitCount: number;
  lifetimeSpend: number;
  lastVisitAt?: string;
  whatsappOptIn?: boolean | null;
  smsOptIn?: boolean | null;
}

export interface CreateCustomerRequest {
  name: string;
  phone?: string;
  branchId?: string;
  society?: string;
  flatUnit?: string;
}

export interface UpdateCustomerRequest {
  name: string;
}

export interface CustomerRegistrationCard {
  tenantName?: string;
  tenantLogoUrl?: string;
  primaryColor?: string;
  branchName?: string;
  branchAddress?: string;
  customerName: string;
  visitPassId: string;
  phone?: string | null;
  publicPassUrl?: string;
  issuedAt?: string;
}

export interface BranchServiceItem {
  id: string;
  branchId: string;
  serviceId: string;
  serviceName: string;
  categoryName: string;
  categoryId?: string;
  parentCategoryId?: string;
  parentCategoryName?: string;
  price: number;
  gstRate: number;
  durationMinutes?: number;
  variablePricing?: boolean;
}

export interface CatalogCategory {
  id: string;
  name: string;
  parentCategoryId?: string | null;
  sortOrder?: number;
  active?: boolean;
}

export interface ServiceBranchAssignment {
  branchServiceId?: string;
  branchId: string;
  branchName: string;
  price: number;
  displayNameOverride?: string;
  active: boolean;
  manualPriceOverride?: boolean;
}

export interface CatalogServiceItem {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  categoryName?: string;
  parentCategoryId?: string;
  parentCategoryName?: string;
  sacCode?: string;
  gstRate?: number;
  durationMinutes?: number;
  active: boolean;
  listPrice?: number;
  branches: ServiceBranchAssignment[];
}

export interface FreeSlot {
  startAt: string;
  endAt: string;
  minutes: number;
}

export interface StaffTimeBlock {
  bookingId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  status: string;
  startAt: string;
  endAt: string;
  estimatedMinutes: number;
  actualMinutes?: number;
  overdue: boolean;
  services: string[];
  source?: string;
}

export interface StaffAvailabilityColumn {
  staffId: string;
  staffName: string;
  skills?: string;
  occupancy: "FREE" | "BUSY" | "OVERDUE" | string;
  busyUntil?: string;
  remainingMinutes?: number;
  blocks: StaffTimeBlock[];
  freeSlots: FreeSlot[];
}

export interface StaffServiceDurationStat {
  staffId: string;
  staffName: string;
  serviceId: string;
  serviceName: string;
  sampleCount: number;
  avgEstimatedMinutes: number;
  avgActualMinutes?: number;
}

export interface BranchAvailability {
  branchId: string;
  branchName: string;
  date: string;
  openTime: string;
  closeTime: string;
  now: string;
  freeStaffCount: number;
  busyStaffCount: number;
  staff: StaffAvailabilityColumn[];
  metrics: {
    sampleVisitCount: number;
    avgVisitMinutes?: number;
    medianVisitMinutes?: number;
    byStaffService: StaffServiceDurationStat[];
  };
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

export interface CustomerListParams {
  name?: string;
  society?: string;
  phone?: string;
  visitPassId?: string;
  minVisitCount?: number;
  maxVisitCount?: number;
  minLifetimeSpend?: number;
  maxLifetimeSpend?: number;
  lastVisitFrom?: string;
  lastVisitTo?: string;
  page?: number;
  size?: number;
}

export interface BookingListParams {
  branchId?: string;
  customerId?: string;
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

export interface MessagingConfig {
  msg91Enabled: boolean;
  whatsappNumber: string;
  billReceiptTemplate: string;
  promoTemplate: string;
  appointmentConfirmedTemplate: string;
  apiPublicUrl: string;
  billReceiptPilotEnabled: boolean;
  billReceiptPilotTenantSlug: string;
  billReceiptPilotBranchCode: string;
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
  filterNames?: string[];
  filterSociety?: string;
  filterPhone?: string;
  filterPhones?: string[];
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
  customers: Customer[];
  previewTruncated: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  channel: CampaignChannel;
  status: CampaignStatus;
  messageText: string;
  filterName?: string;
  filterNames?: string[];
  filterSociety?: string;
  filterPhone?: string;
  filterPhones?: string[];
  filterMinVisitCount?: number;
  filterMaxVisitCount?: number;
  filterMinLifetimeSpend?: number;
  filterMaxLifetimeSpend?: number;
  filterLastVisitFrom?: string;
  filterLastVisitTo?: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount?: number;
  sentAt?: string;
  createdAt: string;
}

export type MessageDeliveryStatus = "PENDING" | "SENT" | "SKIPPED" | "FAILED";

export interface CampaignDelivery {
  id: string;
  customerId?: string;
  customerName?: string;
  recipientPhone?: string;
  status: MessageDeliveryStatus;
  errorMessage?: string;
  providerMessageId?: string;
  createdAt?: string;
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

export interface BillLinePreview {
  lineItemId?: string;
  serviceName: string;
  unitPrice: number;
  quantity: number;
  lineDiscount?: number;
  taxableAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  lineTotal?: number;
}

export interface BillPreview {
  lines?: BillLinePreview[];
  subtotal: number;
  membershipDiscountAmount?: number;
  promoDiscountAmount?: number;
  manualDiscountAmount?: number;
  manualDiscountLabel?: string;
  discountAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  grandTotal: number;
  couponId?: string;
  offerId?: string;
  membershipSubscriptionId?: string;
  membershipLabel?: string;
  promoLabel?: string;
  membershipFeeAmount?: number;
  membershipFeeLabel?: string;
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
  billDiscountType?: "FLAT" | "PERCENT";
  billDiscountValue?: number;
  billDiscountNote?: string;
  couponId?: string;
  offerId?: string;
  membershipSubscriptionId?: string;
  pendingMembershipPlanId?: string;
  billPreview?: BillPreview;
  invoiceId?: string;
  receiptQueued?: boolean;
  receiptDeliveryStatus?: "SENT" | "SKIPPED" | "FAILED" | "PENDING";
  receiptDeliveryError?: string;
  reviewInvitationUrl?: string;
  reviewInvitationToken?: string;
  createdAt: string;
  completedAt?: string;
}

export interface CreateBookingRequest {
  branchId: string;
  customerId: string;
  lines: { branchServiceId: string; staffId: string; quantity: number }[];
  billDiscountType?: string;
  billDiscountValue?: number;
  couponId?: string;
  offerId?: string;
  /** Keep visit open (IN_PROGRESS) so services can be added/changed before final bill. */
  keepOpen?: boolean;
  pendingMembershipPlanId?: string;
}

export type PromoStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "EXPIRED";
export type DiscountType = "FLAT" | "PERCENT";
export type ServiceScopeType = "ALL" | "CATEGORY" | "SERVICES";
export type MembershipCadence = "MONTHS_6" | "MONTHS_12";

export interface Coupon {
  id: string;
  name: string;
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  startsAt: string;
  endsAt: string;
  serviceScope: ServiceScopeType;
  scopeIds: string[];
  branchIds: string[];
  status: PromoStatus;
  maxRedemptionsTotal?: number;
  redemptionCount?: number;
  createdAt: string;
}

export interface CreateCouponRequest {
  name: string;
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  startsAt: string;
  endsAt: string;
  serviceScope?: ServiceScopeType;
  scopeIds?: string[];
  branchIds?: string[];
  status?: PromoStatus;
  maxRedemptionsTotal?: number;
}

export interface Offer {
  id: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  startsAt: string;
  endsAt: string;
  serviceScope: ServiceScopeType;
  scopeIds: string[];
  branchIds: string[];
  status: PromoStatus;
  maxRedemptionsTotal?: number;
  redemptionCount?: number;
  createdAt: string;
}

export interface CreateOfferRequest {
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  startsAt: string;
  endsAt: string;
  serviceScope?: ServiceScopeType;
  scopeIds?: string[];
  branchIds?: string[];
  status?: PromoStatus;
  maxRedemptionsTotal?: number;
}

export interface ApplicablePromo {
  id: string;
  kind: "COUPON" | "OFFER";
  name: string;
  code?: string;
  discountType: DiscountType;
  discountValue: number;
  serviceScope: ServiceScopeType;
  scopeIds: string[];
  endsAt: string;
  status: PromoStatus;
}

export interface MembershipPlan {
  id: string;
  name: string;
  description?: string;
  cadence: MembershipCadence;
  feeAmount: number;
  benefitPercent: number;
  serviceScope: ServiceScopeType;
  scopeIds: string[];
  branchIds: string[];
  status: PromoStatus;
  createdAt: string;
}

export interface CreateMembershipPlanRequest {
  name: string;
  description?: string;
  cadence: MembershipCadence;
  feeAmount: number;
  benefitPercent?: number;
  serviceScope?: ServiceScopeType;
  scopeIds?: string[];
  branchIds?: string[];
  status?: PromoStatus;
}

export interface MembershipListParams {
  branchId?: string;
  q?: string;
  phone?: string;
  card?: string;
  planId?: string;
  endsBefore?: string;
  endsAfter?: string;
  page?: number;
  size?: number;
}

export interface MembershipSubscription {
  id: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  planId: string;
  planName?: string;
  benefitPercent?: number;
  branchId: string;
  branchName?: string;
  cardNumber: string;
  startsOn: string;
  endsOn: string;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  amountPaid: number;
  paymentMode: string;
  paymentReference?: string;
  createdAt: string;
}

export interface SellMembershipRequest {
  customerId: string;
  planId: string;
  branchId: string;
  paymentMode: "CASH" | "UPI" | "CARD";
  paymentReference?: string;
  amount?: number;
}

export interface PaymentRequest {
  mode: "CASH" | "UPI" | "CARD" | "SPLIT";
  amount: number;
  reference?: string;
  splits?: { mode: string; amount: number; reference?: string }[];
  /** Manager tax override; omit both fields to use backend-calculated GST. */
  cgstAmount?: number;
  /** Manager tax override; omit both fields to use backend-calculated GST. */
  sgstAmount?: number;
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
  businessType?: BranchBusinessType;
  phoneNumberRequired?: boolean;
  gstEnabled?: boolean | null;
  gstEffective?: boolean;
  createdAt?: string;
  googleReviewUrl?: string;
  googleReviewAutoPublish?: boolean;
  googlePlaceId?: string;
  googleMapsUrl?: string;
  googleRating?: number;
  googleReviewCount?: number;
  gbpPhotoCount?: number;
  gbpVideoCount?: number;
  gbpHasPhone?: boolean;
  gbpHasWebsite?: boolean;
  gbpHasHours?: boolean;
  gbpHasBookButton?: boolean;
  gbpServicesListedCount?: number;
  estimatedSearchRank?: number;
  digitalPresenceUpdatedAt?: string;
  tenantSlug?: string;
  onlineBookingEnabled?: boolean;
  onlineBookingBrandEnabled?: boolean;
  onlineBookingEffective?: boolean;
  onlineBookingMinLeadMinutes?: number;
  onlineBookingMaxAdvanceDays?: number;
  onlineBookingSlotMinutes?: number;
}

export type BranchBusinessType = "SALON" | "SPA" | "SALON_AND_SPA";

export interface UpdateBranchDigitalPresenceRequest {
  googlePlaceId?: string;
  googleMapsUrl?: string;
  googleReviewUrl?: string;
  googleReviewAutoPublish?: boolean;
  googleRating?: number;
  googleReviewCount?: number;
  gbpPhotoCount?: number;
  gbpVideoCount?: number;
  gbpHasPhone?: boolean;
  gbpHasWebsite?: boolean;
  gbpHasHours?: boolean;
  gbpHasBookButton?: boolean;
  gbpServicesListedCount?: number;
  estimatedSearchRank?: number;
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
  businessType?: BranchBusinessType;
  phoneNumberRequired?: boolean;
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
  businessType?: BranchBusinessType;
  phoneNumberRequired?: boolean;
  gstPolicy?: "INHERIT" | "ENABLED" | "DISABLED";
  onlineBookingEnabled?: boolean;
  onlineBookingBrandEnabled?: boolean;
  onlineBookingEffective?: boolean;
  onlineBookingMinLeadMinutes?: number;
  onlineBookingMaxAdvanceDays?: number;
  onlineBookingSlotMinutes?: number;
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
  gstEnabled?: boolean;
  onlineBookingEnabled?: boolean;
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
  branchStats: {
    branchId: string;
    branchName: string;
    revenue: number;
    visits: number;
    avgTicket: number;
    discountAmount: number;
  }[];
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
  locationHighAccuracy?: boolean;
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

export interface InvoiceDetail {
  id: string;
  bookingId: string;
  invoiceNumber: string;
  subtotal: number;
  discountAmount: number;
  membershipDiscountAmount?: number;
  promoDiscountAmount?: number;
  membershipLabel?: string;
  promoLabel?: string;
  membershipFeeAmount?: number;
  membershipFeeLabel?: string;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  grandTotal: number;
  customerName: string;
  customerPhone: string;
  issuedAt: string;
  pdfAvailable: boolean;
  pdfStoredAt?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  primaryColor?: string;
  gstEnabled?: boolean;
  onlineBookingEnabled?: boolean;
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
  businessType?: BranchBusinessType;
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

export interface BenchmarkMetricComparison {
  key: string;
  label: string;
  yourValue: number;
  peerMedian?: number | null;
  topQuartile?: number | null;
  gapToMedian?: number | null;
  gapToTopQuartile?: number | null;
  unit: string;
  direction: string;
  status: string;
  percentileRank?: number | null;
}

export interface BranchBenchmarkRow {
  branchId: string;
  branchName: string;
  revenuePerBranchDay: number;
  avgTicket: number;
  visitsPerBranchDay: number;
  netMarginPercent: number;
  retailAttachPercent: number;
  repeatVisitRate: number;
  discountLeakagePercent: number;
  rankInBrand?: number;
  branchCount?: number;
  brandPercentileLabel?: string;
}

export interface PeerBenchmarkRow {
  peerLabel: string;
  tierLabel: string;
  branchCount: number;
  revenuePerBranchDay: number;
  avgTicket: number;
  retailAttachPercent: number;
  netMarginPercent: number;
  repeatVisitRate: number;
  isYou: boolean;
}

export interface LocalCompetitorRow {
  id: string;
  name: string;
  competitorType: string;
  branchId?: string;
  branchName?: string;
  revenuePerBranchDay?: number;
  avgTicket?: number;
  retailAttachPercent?: number;
  netMarginPercent?: number;
  repeatVisitRate?: number;
  address?: string;
  notes?: string;
  googleRating?: number;
  googleReviewCount?: number;
  gbpPhotoCount?: number;
  gbpVideoCount?: number;
  gbpHasPhone?: boolean;
  estimatedSearchRank?: number;
}

export interface BenchmarkPlaybookItem {
  id: string;
  severity: string;
  title: string;
  message: string;
  metricKey: string;
  estimatedMonthlyImpact?: number;
  actionModule: string;
  actionLabel: string;
}

export interface BenchmarkResponse {
  periodLabel: string;
  brandName: string;
  marketCity: string;
  cohortLabel: string;
  cohortSize: number;
  brandRank?: number | null;
  metricsAboveMedian: number;
  totalMetrics: number;
  estimatedMonthlyOpportunity: number;
  heroMetrics: BenchmarkMetricComparison[];
  allMetrics: BenchmarkMetricComparison[];
  branchRankings: BranchBenchmarkRow[];
  networkPeers: PeerBenchmarkRow[];
  localCompetitors: LocalCompetitorRow[];
  playbook: BenchmarkPlaybookItem[];
  benchmarkOptIn: boolean;
}

export interface BenchmarkSettings {
  benchmarkOptIn: boolean;
  marketCity: string;
  salonTier: string;
}

export interface UpsertLocalCompetitorRequest {
  name: string;
  competitorType?: string;
  branchId?: string;
  address?: string;
  notes?: string;
  revenuePerBranchDay?: number;
  avgTicket?: number;
  retailAttachPercent?: number;
  netMarginPercent?: number;
  repeatVisitRate?: number;
  googleRating?: number;
  googleReviewCount?: number;
  gbpPhotoCount?: number;
  gbpVideoCount?: number;
  gbpHasPhone?: boolean;
  estimatedSearchRank?: number;
}

export interface LocalSpotlightBranchRow {
  branchId: string;
  branchName: string;
  branchCode?: string | null;
  localityLabel: string;
  businessType?: BranchBusinessType | null;
  localVisibilityScore: number;
  scoreLabel: string;
  estimatedSearchRank?: number | null;
  inTop3: boolean;
  googleRating?: number | null;
  googleReviewCount?: number | null;
  googleLowRatingReviewCount?: number | null;
  googleReviewsSampleSize?: number | null;
  gbpCompletenessPercent: number;
  listingLinked: boolean;
  googleSynced?: boolean;
  pilotBranch?: boolean;
  gbpHasPhone: boolean;
  gbpHasWebsite: boolean;
  gbpHasHours: boolean;
  gbpHasBookButton: boolean;
  gbpPhotoCount?: number | null;
  gbpVideoCount?: number | null;
  gbpServicesListedCount?: number | null;
  googlePlaceId?: string | null;
  googleMapsUrl?: string | null;
  googleReviewUrl?: string | null;
  googleReviewAutoPublish?: boolean | null;
  googleFormattedAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  digitalPresenceUpdatedAt?: string | null;
  trackedRivalCount: number;
}

export interface LocalSpotlightRivalRow {
  id: string;
  name: string;
  branchId?: string | null;
  branchName?: string | null;
  googleRating?: number | null;
  googleReviewCount?: number | null;
  googleLowRatingReviewCount?: number | null;
  googleReviewsSampleSize?: number | null;
  gbpPhotoCount?: number | null;
  gbpVideoCount?: number | null;
  gbpHasPhone?: boolean | null;
  estimatedSearchRank?: number | null;
  address?: string | null;
  googlePlaceId?: string | null;
  googleMapsUrl?: string | null;
  googleAutoDiscovered?: boolean;
}

export interface LocalSpotlightTopThreeRival {
  rank: number;
  name: string;
  googleMapsUrl?: string | null;
  googlePlaceId?: string | null;
}

export interface LocalSpotlightSearchRankRow {
  branchId: string;
  branchName: string;
  keyword: string;
  yourRank?: number | null;
  yourRankBeyondTop20?: boolean;
  yourRankLabel?: string | null;
  inTop3: boolean;
  topThreeSummary: string;
  topThreeRivals?: LocalSpotlightTopThreeRival[];
}

export interface LocalSpotlightPlaybookItem {
  id: string;
  severity: string;
  section?: string | null;
  subCategory?: string | null;
  title: string;
  message: string;
  reasoning?: string | null;
  keyword?: string | null;
  keywords?: string[] | null;
  metricKey: string;
  actionTarget?: string | null;
  actionModule?: string | null;
  actionLabel: string;
  branchId?: string | null;
  branchName?: string | null;
}

export interface LocalSpotlightResponse {
  localVisibilityScore: number;
  scoreLabel: string;
  branchesLinked: number;
  branchesTotal: number;
  notInTop3Count: number;
  ratingBelowRivalsCount: number;
  incompleteGbpCount: number;
  missingPhoneCount: number;
  dataSourceNote: string;
  lastRefreshedAt?: string | null;
  googleApiConfigured?: boolean;
  pilotMode?: boolean;
  pilotBranchCode?: string | null;
  pilotBranchName?: string | null;
  syncStatusMessage?: string | null;
  branches: LocalSpotlightBranchRow[];
  rivals: LocalSpotlightRivalRow[];
  searchRanks: LocalSpotlightSearchRankRow[];
  playbook: LocalSpotlightPlaybookItem[];
}

export interface LocalSpotlightSyncResponse {
  skipped: boolean;
  branchId?: string | null;
  branchName?: string | null;
  ownListingMatched?: boolean;
  ownListingName?: string | null;
  googleMapsUrl?: string | null;
  googleFormattedAddress?: string | null;
  rivalsSynced?: number;
  searchRanks?: Record<string, number>;
  message?: string | null;
  syncedAt?: string | null;
}

export interface ReviewInvitation {
  invitationId?: string;
  visitId?: string;
  token?: string;
  reviewUrl?: string;
  status?: string;
  expiresAt?: string;
  submittedRating?: number | null;
}

export interface GuestVoiceSummary {
  averageRating: number;
  totalReviews: number;
  promotersCount: number;
  detractorsCount: number;
  ratingDistribution: Record<number, number>;
  improvementTagCounts: Record<string, number>;
  categoryAverageRatings?: Record<string, number>;
  reviews?: GuestVoiceReviewItem[];
  openRecoveries: {
    recoveryId: string;
    visitId: string;
    branchId: string;
    branchName?: string | null;
    customerFirstName?: string | null;
    overallRating: number;
    status: string;
    improvementTags?: string[];
    comment?: string | null;
    createdAt: string;
  }[];
}

export interface GuestVoiceReviewItem {
  reviewId: string;
  visitId: string;
  branchId: string;
  branchName?: string | null;
  customerFirstName: string;
  overallRating: number;
  categoryRatings: Record<string, number>;
  improvementTags: string[];
  comment?: string | null;
  submittedAt: string;
  googleReviewRedirected?: boolean;
}

export interface PublicReviewContext {
  branchName: string;
  customerFirstName: string;
  status: string;
  alreadySubmitted: boolean;
  submittedRating?: number | null;
  googleReviewUrl?: string | null;
  googleReviewAutoPublish?: boolean;
  googleAutoPublishMinRating?: number;
  improvementTagOptions: string[];
  categoryOptions?: { id: string; label: string }[];
}

export interface SubmitPublicReviewPayload {
  token: string;
  overallRating: number;
  categoryRatings?: Record<string, number>;
  improvementTags?: string[];
  comment?: string;
  googleReviewRedirected?: boolean;
}

export interface SubmitPublicReviewResult {
  overallRating: number;
  promptGoogleReview: boolean;
  googleReviewUrl?: string | null;
  autoRedirectGoogle?: boolean;
  googleReviewAutoPublished?: boolean;
  suggestedPublicReviewText?: string | null;
  recoveryCreated: boolean;
  thankYouMessage: string;
}

