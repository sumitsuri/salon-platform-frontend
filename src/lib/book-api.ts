import { resolveClientApiBase } from "./client-api-base";

function apiBase(): string {
  return resolveClientApiBase();
}

interface ApiWrapper<T> {
  success: boolean;
  message?: string;
  data: T;
}

async function publicGet<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, { cache: "no-store" });
  const body = (await res.json()) as ApiWrapper<T> & { message?: string };
  if (!res.ok || body.success === false) {
    throw new Error(body.message || "Request failed");
  }
  if (body.success !== true || body.data === undefined) {
    throw new Error(body.message || "Request failed");
  }
  return body.data;
}

async function publicPost<T>(path: string, payload: unknown): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await res.json()) as ApiWrapper<T> & { message?: string };
  if (!res.ok || body.success === false) {
    throw new Error(body.message || "Request failed");
  }
  if (body.success !== true || body.data === undefined) {
    throw new Error(body.message || "Request failed");
  }
  return body.data;
}

export type BookBranchSummary = {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  openTime?: string;
  closeTime?: string;
};

export type BookContext = {
  tenantName: string;
  tenantSlug: string;
  primaryColor?: string;
  logoUrl?: string;
  branchId: string;
  branchName: string;
  branchCode: string;
  address?: string;
  phone?: string;
  openTime?: string;
  closeTime?: string;
  onlineBookingEnabled: boolean;
  minLeadMinutes: number;
  maxAdvanceDays: number;
  slotMinutes: number;
  bookBaseUrl: string;
  phoneNumberRequired: boolean;
  otpRequired: boolean;
};

export type BookService = {
  branchServiceId: string;
  serviceId: string;
  name: string;
  categoryId?: string;
  categoryName?: string;
  parentCategoryId?: string;
  parentCategoryName?: string;
  price: number;
  durationMinutes?: number;
};

export type BookStaff = {
  id: string;
  name: string;
  skills?: string;
};

export type BookSlot = {
  startAt: string;
  endAt: string;
  staffId: string;
  staffName: string;
};

export type BookAppointment = {
  bookingId: string;
  confirmationCode: string;
  manageUrl: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  serviceName: string;
  serviceNames?: string[];
  staffName: string;
  branchName: string;
  customerName: string;
  visitPassId?: string;
  visitPassUrl?: string;
};

export type BookOtpResponse = {
  sent: boolean;
  message: string;
  devOtp?: string;
};

export function bookPath(tenantSlug: string, branchCode?: string) {
  const base = `/book/${tenantSlug}`;
  return branchCode ? `${base}/${branchCode.toLowerCase()}/` : `${base}/`;
}

export const bookApi = {
  listBranches(tenantSlug: string) {
    return publicGet<{
      tenantName: string;
      tenantSlug: string;
      primaryColor?: string;
      logoUrl?: string;
      branches: BookBranchSummary[];
    }>(`/api/v1/public/book/${encodeURIComponent(tenantSlug)}`);
  },

  getContext(tenantSlug: string, branchCode: string) {
    return publicGet<BookContext>(
      `/api/v1/public/book/${encodeURIComponent(tenantSlug)}/${encodeURIComponent(branchCode)}`
    );
  },

  listServices(tenantSlug: string, branchCode: string) {
    return publicGet<BookService[]>(
      `/api/v1/public/book/${encodeURIComponent(tenantSlug)}/${encodeURIComponent(branchCode)}/services`
    );
  },

  listStaff(tenantSlug: string, branchCode: string) {
    return publicGet<BookStaff[]>(
      `/api/v1/public/book/${encodeURIComponent(tenantSlug)}/${encodeURIComponent(branchCode)}/staff`
    );
  },

  listSlots(
    tenantSlug: string,
    branchCode: string,
    date: string,
    branchServiceIds: string[],
    staffId?: string
  ) {
    const params = new URLSearchParams({ date });
    for (const id of branchServiceIds) {
      params.append("branchServiceIds", id);
    }
    if (staffId) params.set("staffId", staffId);
    return publicGet<BookSlot[]>(
      `/api/v1/public/book/${encodeURIComponent(tenantSlug)}/${encodeURIComponent(branchCode)}/slots?${params}`
    );
  },

  sendOtp(tenantSlug: string, branchCode: string, phone: string) {
    return publicPost<BookOtpResponse>(
      `/api/v1/public/book/${encodeURIComponent(tenantSlug)}/${encodeURIComponent(branchCode)}/otp/send`,
      { phone }
    );
  },

  createAppointment(
    tenantSlug: string,
    branchCode: string,
    payload: {
      phone?: string;
      otp?: string;
      customerName: string;
      branchServiceIds: string[];
      staffId?: string;
      startAt: string;
      society?: string;
      flatUnit?: string;
      note?: string;
    }
  ) {
    return publicPost<BookAppointment>(
      `/api/v1/public/book/${encodeURIComponent(tenantSlug)}/${encodeURIComponent(branchCode)}/appointments`,
      payload
    );
  },
};
