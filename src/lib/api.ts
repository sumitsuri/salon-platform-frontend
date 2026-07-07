const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

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
}

interface ApiWrapper<T> {
  success: boolean;
  message?: string;
  data: T;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("auth");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed?.state?.user?.accessToken ?? parsed?.accessToken ?? null;
  } catch {
    return null;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const text = await res.text();

  let body: ApiWrapper<T> & { message?: string } = { success: false, data: undefined as T };
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error(res.ok ? "Invalid server response" : `Request failed (${res.status})`);
    }
  }

  if (!res.ok) {
    throw new Error(body.message || `Request failed (${res.status})`);
  }
  return body.data;
}

export const api = {
  login: (email: string, password: string) =>
    request<AuthUser>("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  me: () => request<AuthUser>("/api/v1/auth/me"),

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
    if (params?.status) search.set("status", params.status);
    if (params?.minAmount != null) search.set("minAmount", String(params.minAmount));
    if (params?.maxAmount != null) search.set("maxAmount", String(params.maxAmount));
    if (params?.dateFrom) search.set("dateFrom", params.dateFrom);
    if (params?.dateTo) search.set("dateTo", params.dateTo);
    search.set("page", String(params?.page ?? 0));
    search.set("size", String(params?.size ?? 20));
    return request<PageResult<Booking>>(`/api/v1/bookings?${search.toString()}`);
  },

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

  getBranches: () => request<Branch[]>("/api/v1/branches"),

  getInvoices: () => request<Invoice[]>("/api/v1/invoices"),

  getInvoicePdfUrl: (invoiceId: string) => `${API_BASE}/api/v1/invoices/${invoiceId}/pdf`,

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
}

export interface BookingListParams {
  branchId?: string;
  customer?: string;
  branch?: string;
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
  societyDefault?: string;
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
