"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  CreditCard,
  Clock,
  Receipt,
  UserPlus,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  X,
} from "lucide-react";
import {
  api,
  BillPreview,
  Booking,
  BranchServiceItem,
  MembershipSubscription,
} from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { isValidIndianMobile, normalizeIndianMobile, digitsOnly } from "@/lib/phone";
import {
  getRecentServiceIds,
  pushRecentService,
  getFavoriteServiceIds,
  toggleFavoriteService,
  getRecentCustomers,
  pushRecentCustomer,
  loadWalkInDraft,
  saveWalkInDraft,
  clearWalkInDraft,
  type RecentCustomer,
  type WalkInDraft,
} from "@/lib/walk-in-prefs";
import { getTenantLocaleKit, formatTenantDateTime } from "@/lib/tenant-locale";
import { formatCurrency, formatMoney, cn } from "@/lib/utils";
import {
  PageHeader,
  Card,
  AlertBanner,
  SegmentedControl,
  StatusBadge,
  EmptyState,
  inputClass,
  selectClass,
  btnPrimary,
  btnSecondary,
} from "@/components/ui";
import { WizardSteps } from "@/components/enterprise-ui";
import { MissionStrip } from "@/components/brand/MissionStrip";
import { BookingsHistoryPanel } from "@/components/manager/BookingsHistoryPanel";
import { ReviewInvitationPanel } from "@/components/reviews/ReviewInvitationPanel";
import { InvoicePdfButtons } from "@/components/billing/InvoicePdfButtons";
import { WalkInCustomerChip } from "./WalkInCustomerChip";
import { WalkInCompactSteps } from "./WalkInCompactSteps";
import { WalkInMembershipPicker } from "./WalkInMembershipPicker";
import { WalkInMembershipSavingsBanner } from "./WalkInMembershipSavingsBanner";
import { WalkInServiceCatalog } from "./WalkInServiceCatalog";
import { WalkInCartPanel } from "./WalkInCartPanel";
import { BillBreakdownRows, membershipFeeServiceLine } from "@/components/billing/BillBreakdownRows";
import { WalkInPromoAdjustments } from "./WalkInPromoAdjustments";
import { WalkInCartItem, walkInCartLinePrice } from "./walk-in-types";

type Screen = "hub" | "flow";
type HubTab = "open" | "history";
type Step = 1 | 2 | 3;
type DiscountKind = "" | "FLAT" | "PERCENT";
type PaymentMode = "CASH" | "UPI" | "CARD" | "SPLIT";

interface CartItem extends WalkInCartItem {}

function cartLinePrice(c: CartItem) {
  return walkInCartLinePrice(c);
}

function normalizeCartItem(
  item: WalkInDraft["cart"][number],
  servicesById: Map<string, BranchServiceItem>
): CartItem {
  const svc = servicesById.get(item.branchServiceId);
  const basePrice = item.basePrice ?? svc?.price ?? item.price ?? 0;
  const variablePricing = item.variablePricing ?? svc?.variablePricing ?? false;
  let priceExtra = item.priceExtra ?? 0;
  if (item.price != null && item.basePrice == null && item.priceExtra == null) {
    priceExtra = Math.max(0, item.price - basePrice);
  }
  return {
    branchServiceId: item.branchServiceId,
    serviceName: item.serviceName,
    basePrice,
    priceExtra,
    variablePricing,
    staffId: item.staffId,
  };
}

interface SplitRow {
  mode: "CASH" | "UPI" | "CARD";
  amount: string;
  reference: string;
}

const OPEN_STATUSES = new Set(["DRAFT", "IN_PROGRESS", "READY_FOR_BILLING"]);
const DRAFT_SAVE_DEBOUNCE_MS = 600;

export default function WalkInPage() {
  const t = useTranslations("manager.walkIn");
  const tCommon = useTranslations("common");
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branchId || "";
  const router = useRouter();
  const searchParams = useSearchParams();
  const preferredStaffId = searchParams.get("staffId") || "";
  const wantNewVisit = searchParams.get("new") === "1";
  const hubTabParam = searchParams.get("tab") === "history" ? "history" : "open";
  const queryClient = useQueryClient();
  const localeKit = getTenantLocaleKit();

  const [screen, setScreen] = useState<Screen>("hub");
  const [hubTab, setHubTab] = useState<HubTab>(hubTabParam);
  const [step, setStep] = useState<Step>(1);
  const [phone, setPhone] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [society, setSociety] = useState(user?.branchName ?? "");
  const [flat, setFlat] = useState("");
  const [lookupState, setLookupState] = useState<"idle" | "loading" | "done">("idle");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("CASH");
  const [reference, setReference] = useState("");
  const [splitRows, setSplitRows] = useState<SplitRow[]>([
    { mode: "CASH", amount: "", reference: "" },
    { mode: "UPI", amount: "", reference: "" },
  ]);
  const [bookingId, setBookingId] = useState("");
  const [bookingStatus, setBookingStatus] = useState("");
  const [billPreview, setBillPreview] = useState<BillPreview | null>(null);
  const [error, setError] = useState("");
  const [selectedCouponId, setSelectedCouponId] = useState("");
  const [selectedOfferId, setSelectedOfferId] = useState("");
  const [membership, setMembership] = useState<MembershipSubscription | null>(null);
  const [billDiscountType, setBillDiscountType] = useState<DiscountKind>("");
  const [billDiscountValue, setBillDiscountValue] = useState("");
  const [paidInvoiceId, setPaidInvoiceId] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState("");
  const [receiptQueued, setReceiptQueued] = useState(false);
  const [reviewInvitationUrl, setReviewInvitationUrl] = useState("");
  const [reviewSubmittedRating, setReviewSubmittedRating] = useState<number | null>(null);
  const [cgstInput, setCgstInput] = useState("0");
  const [sgstInput, setSgstInput] = useState("0");
  const [taxAdvanced, setTaxAdvanced] = useState(false);
  const [taxOverridden, setTaxOverridden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [catalogTop, setCatalogTop] = useState("");
  const [serviceQuery, setServiceQuery] = useState("");
  const [recentServiceIds, setRecentServiceIds] = useState<string[]>([]);
  const [favoriteServiceIds, setFavoriteServiceIds] = useState<string[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<RecentCustomer[]>([]);
  const [draftOffer, setDraftOffer] = useState<WalkInDraft | null>(null);
  const [draftHandled, setDraftHandled] = useState(false);
  const [draftRestoredNotice, setDraftRestoredNotice] = useState(false);
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [addedToast, setAddedToast] = useState<string | null>(null);
  const [pendingMembershipPlanId, setPendingMembershipPlanId] = useState("");

  const lookupPhoneRef = useRef<string>("");
  const steps = [t("stepCustomer"), t("stepServices"), t("stepPayment")];
  const billingLocked = !!paidInvoiceId;

  useEffect(() => {
    if (!addedToast) return;
    const id = setTimeout(() => setAddedToast(null), 2200);
    return () => clearTimeout(id);
  }, [addedToast]);

  useEffect(() => {
    if (step !== 2) setCartSheetOpen(false);
  }, [step]);

  useEffect(() => {
    if (!branchId) return;
    setRecentServiceIds(getRecentServiceIds(branchId));
    setFavoriteServiceIds(getFavoriteServiceIds(branchId));
    setRecentCustomers(getRecentCustomers(branchId));
  }, [branchId]);

  const { data: services = [] } = useQuery({
    queryKey: ["services", branchId],
    queryFn: () => api.getBranchServices(branchId),
    enabled: !!branchId,
  });

  const servicesById = useMemo(() => {
    const map = new Map<string, BranchServiceItem>();
    for (const s of services) map.set(s.id, s);
    return map;
  }, [services]);

  const topCategories = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of services) {
      const id = s.parentCategoryId || s.categoryId || "other";
      const name = s.parentCategoryName || s.categoryName || "Other";
      if (!map.has(id)) map.set(id, name);
    }
    const preferred = ["Men", "Women", "Kids", "Shared"];
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => {
        const ai = preferred.indexOf(a.name);
        const bi = preferred.indexOf(b.name);
        if (ai >= 0 || bi >= 0) return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
        return a.name.localeCompare(b.name);
      });
  }, [services]);

  const filteredServices = useMemo(() => {
    const q = serviceQuery.trim().toLowerCase();
    if (q) {
      return services.filter(
        (s) =>
          s.serviceName.toLowerCase().includes(q) ||
          (s.categoryName || "").toLowerCase().includes(q) ||
          (s.parentCategoryName || "").toLowerCase().includes(q)
      );
    }
    if (catalogTop) {
      return services.filter((s) => (s.parentCategoryId || s.categoryId || "other") === catalogTop);
    }
    return services;
  }, [services, catalogTop, serviceQuery]);

  const recentServices = useMemo(
    () => recentServiceIds.map((id) => servicesById.get(id)).filter((s): s is BranchServiceItem => !!s),
    [recentServiceIds, servicesById]
  );
  const favoriteServices = useMemo(
    () => favoriteServiceIds.map((id) => servicesById.get(id)).filter((s): s is BranchServiceItem => !!s),
    [favoriteServiceIds, servicesById]
  );

  const { data: staff = [] } = useQuery({
    queryKey: ["staff", branchId],
    queryFn: () => api.getStaff(branchId),
    enabled: !!branchId,
  });

  const { data: branch } = useQuery({
    queryKey: ["branch", branchId],
    queryFn: () => api.getBranch(branchId),
    enabled: !!branchId && screen === "flow" && step === 3,
  });

  const { data: applicablePromos = [] } = useQuery({
    queryKey: ["applicable-promos", branchId],
    queryFn: () => api.getApplicablePromos(branchId),
    enabled: !!branchId && screen === "flow" && step === 3,
  });

  const {
    data: openVisitsData,
    isLoading: openVisitsLoading,
    refetch: refetchOpenVisits,
  } = useQuery({
    queryKey: ["open-visits", branchId],
    queryFn: async () => {
      const [inProgress, ready] = await Promise.all([
        api.getBookings({ branchId, status: "IN_PROGRESS", page: 0, size: 50 }),
        api.getBookings({ branchId, status: "READY_FOR_BILLING", page: 0, size: 50 }),
      ]);
      const merged = [...(ready.content || []), ...(inProgress.content || [])];
      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return merged;
    },
    enabled: !!branchId && screen === "hub",
  });

  const openVisits = openVisitsData ?? [];
  const coupons = useMemo(() => applicablePromos.filter((p) => p.kind === "COUPON"), [applicablePromos]);
  const offers = useMemo(() => applicablePromos.filter((p) => p.kind === "OFFER"), [applicablePromos]);

  useEffect(() => {
    if (!customerId) {
      setMembership(null);
      setPendingMembershipPlanId("");
      return;
    }
    api
      .getActiveMembership(customerId)
      .then((m) => {
        setMembership(m);
        if (m) setPendingMembershipPlanId("");
      })
      .catch(() => setMembership(null));
  }, [customerId]);

  useEffect(() => {
    if (!bookingId || billingLocked || screen !== "flow") return;
    const delay = step === 3 ? 200 : 400;
    const handle = setTimeout(() => {
      void api
        .setPendingMembershipPlan(bookingId, pendingMembershipPlanId || null)
        .then((b) => {
          setBillPreview(b.billPreview ?? null);
          setBookingStatus(b.status);
        })
        .catch((e) => setError(e instanceof Error ? e.message : tCommon("failed")));
    }, delay);
    return () => clearTimeout(handle);
  }, [pendingMembershipPlanId, bookingId, billingLocked, screen, step, tCommon]);

  // Sync CGST/SGST from the server-calculated bill unless the manager is mid-edit in Advanced.
  useEffect(() => {
    if (!billPreview) return;
    if (taxAdvanced && taxOverridden) return;
    setCgstInput(String(billPreview.cgstAmount ?? 0));
    setSgstInput(String(billPreview.sgstAmount ?? 0));
    setTaxOverridden(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to new billPreview identities from the server
  }, [billPreview]);

  const hydrateFromBooking = useCallback((b: Booking) => {
    setBookingId(b.id);
    setBookingStatus(b.status);
    setCustomerId(b.customerId);
    setCustomerName(b.customerName);
    setPhone(b.customerPhone || "");
    setSelectedCouponId(b.couponId || "");
    setSelectedOfferId(b.offerId || "");
    if (b.billDiscountType) {
      setBillDiscountType(b.billDiscountType);
      setBillDiscountValue(String(b.billDiscountValue ?? ""));
    } else {
      setBillDiscountType("");
      setBillDiscountValue("");
    }
    setBillPreview(b.billPreview ?? null);
    setCart(
      (b.lines || []).map((l) => {
        const svc = servicesById.get(l.branchServiceId);
        const basePrice = svc?.price ?? l.unitPrice;
        return {
          branchServiceId: l.branchServiceId,
          serviceName: l.serviceName,
          basePrice,
          priceExtra: Math.max(0, l.unitPrice - basePrice),
          variablePricing: svc?.variablePricing ?? false,
          staffId: l.staffId,
        };
      })
    );
    setPaidInvoiceId(b.invoiceId && b.status === "COMPLETED" ? b.invoiceId : "");
    setPendingMembershipPlanId(b.pendingMembershipPlanId || "");
    setPaymentSuccess("");
    setReceiptQueued(false);
    setPaymentMode("CASH");
    setReference("");
    setSplitRows([
      { mode: "CASH", amount: "", reference: "" },
      { mode: "UPI", amount: "", reference: "" },
    ]);
    setTaxAdvanced(false);
    setTaxOverridden(false);
    setError("");
  }, [servicesById]);

  useEffect(() => {
    if (preferredStaffId) {
      setScreen("flow");
      setStep(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open flow once when arriving from Floor with a staff preselect
  }, []);

  useEffect(() => {
    setHubTab(hubTabParam);
  }, [hubTabParam]);

  function setVisitsTab(next: HubTab) {
    setHubTab(next);
    if (next === "history") {
      router.replace("/manager/walk-in?tab=history");
    } else {
      router.replace("/manager/walk-in");
    }
  }

  // Offer to restore an unfinished draft when landing on the hub with no booking in the URL.
  useEffect(() => {
    if (!branchId || draftHandled) return;
    if (searchParams.get("bookingId")) return;
    const draft = loadWalkInDraft(branchId);
    if (draft && draft.cart.length > 0) setDraftOffer(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot check on load
  }, [branchId, draftHandled]);

  function acceptDraft() {
    if (!draftOffer) return;
    setPhone(draftOffer.phone);
    setCustomerName(draftOffer.customerName);
    setCustomerId(draftOffer.customerId);
    setSociety(draftOffer.society || user?.branchName || "");
    setFlat(draftOffer.flat);
    setCart(draftOffer.cart.map((c) => normalizeCartItem(c, servicesById)));
    setStep(draftOffer.step);
    setScreen("flow");
    setDraftOffer(null);
    setDraftHandled(true);
    setDraftRestoredNotice(true);
    router.replace("/manager/walk-in");
  }

  function dismissDraft() {
    clearWalkInDraft(branchId);
    setDraftOffer(null);
    setDraftHandled(true);
  }

  // Debounced local draft save while a visit is in progress but not yet a real booking.
  useEffect(() => {
    if (screen !== "flow" || bookingId || !branchId) return;
    if (!phone && cart.length === 0) return;
    const handle = setTimeout(() => {
      saveWalkInDraft(branchId, { phone, customerName, customerId, society, flat, cart, step });
    }, DRAFT_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [screen, bookingId, branchId, phone, customerName, customerId, society, flat, cart, step]);

  const startNewVisit = useCallback(() => {
    clearWalkInDraft(branchId);
    setBookingId("");
    setBookingStatus("");
    setPhone("");
    setCustomerId("");
    setCustomerName("");
    setSociety(user?.branchName ?? "");
    setFlat("");
    setLookupState("idle");
    lookupPhoneRef.current = "";
    setCart([]);
    setBillPreview(null);
    setSelectedCouponId("");
    setSelectedOfferId("");
    setBillDiscountType("");
    setBillDiscountValue("");
    setPaidInvoiceId("");
    setPaymentSuccess("");
    setReceiptQueued(false);
    setCatalogTop("");
    setServiceQuery("");
    setError("");
    setDraftOffer(null);
    setDraftRestoredNotice(false);
    setHubTab("open");
    setPendingMembershipPlanId("");
    setStep(1);
    setScreen("flow");
    router.replace("/manager/walk-in");
  }, [router, user?.branchName, branchId]);

  useEffect(() => {
    if (!wantNewVisit) return;
    if (searchParams.get("bookingId") || preferredStaffId) return;
    startNewVisit();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-shot from ?new=1
  }, [wantNewVisit]);

  const openVisit = useCallback(
    async (id: string, opts?: { preferBill?: boolean; preferEdit?: boolean }) => {
      const preferBill = opts?.preferBill === true;
      const preferEdit = opts?.preferEdit === true;
      setError("");
      setSaving(true);
      try {
        const b = await api.getBooking(id);
        if (!OPEN_STATUSES.has(b.status) && b.status !== "COMPLETED") {
          setError(t("visitNotEditable"));
          return;
        }
        hydrateFromBooking(b);
        setScreen("flow");
        if (preferEdit) {
          setStep(2);
        } else if (b.status === "READY_FOR_BILLING" || preferBill) {
          setStep(3);
        } else {
          setStep(2);
        }
        router.replace(`/manager/walk-in?bookingId=${id}${preferEdit ? "&edit=1" : ""}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : tCommon("failed"));
      } finally {
        setSaving(false);
      }
    },
    [hydrateFromBooking, router, t, tCommon]
  );

  // Resume from query string
  useEffect(() => {
    const id = searchParams.get("bookingId");
    if (!id || !branchId) return;
    if (bookingId === id && screen === "flow") return;
    const preferEdit = searchParams.get("edit") === "1";
    void openVisit(id, { preferEdit });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-shot from URL
  }, [searchParams, branchId]);

  const applyPromo = useMutation({
    mutationFn: (data: { couponId?: string | null; offerId?: string | null; clearPromo?: boolean }) =>
      api.applyBookingPromo(bookingId, data),
    onSuccess: (b) => {
      setBillPreview(b.billPreview ?? null);
      setBookingStatus(b.status);
      if (b.billDiscountType) {
        setBillDiscountType(b.billDiscountType);
        setBillDiscountValue(String(b.billDiscountValue ?? ""));
      } else {
        setBillDiscountType("");
        setBillDiscountValue("");
      }
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  const applyBillDiscount = useMutation({
    mutationFn: (data: {
      billDiscountType?: "FLAT" | "PERCENT" | null;
      billDiscountValue?: number | null;
      clearDiscount?: boolean;
    }) => api.applyBookingBillDiscount(bookingId, data),
    onSuccess: (b) => {
      setBillPreview(b.billPreview ?? null);
      setBookingStatus(b.status);
      setSelectedCouponId(b.couponId || "");
      setSelectedOfferId(b.offerId || "");
      if (b.billDiscountType) {
        setBillDiscountType(b.billDiscountType);
        setBillDiscountValue(String(b.billDiscountValue ?? ""));
      } else {
        setBillDiscountType("");
        setBillDiscountValue("");
      }
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  const cgstNum = Number(cgstInput);
  const sgstNum = Number(sgstInput);
  const taxValid = !taxOverridden || (Number.isFinite(cgstNum) && cgstNum >= 0 && Number.isFinite(sgstNum) && sgstNum >= 0);

  const displayGrandTotal = useMemo(() => {
    if (!billPreview) return 0;
    const fee = billPreview.membershipFeeAmount ?? 0;
    if (taxOverridden) {
      const cgst = Number.isFinite(cgstNum) ? cgstNum : 0;
      const sgst = Number.isFinite(sgstNum) ? sgstNum : 0;
      return Math.round((billPreview.taxableAmount + cgst + sgst + fee) * 100) / 100;
    }
    return billPreview.grandTotal;
  }, [billPreview, cgstNum, sgstNum, taxOverridden]);

  const splitSum = useMemo(
    () => splitRows.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [splitRows]
  );
  const splitValid = Math.abs(splitSum - displayGrandTotal) <= 0.01;

  const payBooking = useMutation({
    mutationFn: (payload: {
      mode: PaymentMode;
      amount: number;
      reference?: string;
      splits?: { mode: string; amount: number; reference?: string }[];
      cgstAmount?: number;
      sgstAmount?: number;
    }) => api.payBooking(bookingId, payload),
    onSuccess: (booking) => {
      if (booking.invoiceId) setPaidInvoiceId(booking.invoiceId);
      setBookingStatus("COMPLETED");
      setReceiptQueued(!!booking.receiptQueued);
      setReviewInvitationUrl(booking.reviewInvitationUrl ?? "");
      setReviewSubmittedRating(null);
      setPaymentSuccess(t("paymentComplete"));
      clearWalkInDraft(branchId);
      void queryClient.invalidateQueries({ queryKey: ["open-visits", branchId] });
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  function submitPayment() {
    const payload: {
      mode: PaymentMode;
      amount: number;
      reference?: string;
      splits?: { mode: string; amount: number; reference?: string }[];
      cgstAmount?: number;
      sgstAmount?: number;
    } = {
      mode: paymentMode,
      amount: Number(displayGrandTotal.toFixed(2)),
    };
    if (paymentMode === "SPLIT") {
      payload.splits = splitRows.map((r) => ({
        mode: r.mode,
        amount: Number(r.amount) || 0,
        reference: r.reference || undefined,
      }));
    } else if (reference) {
      payload.reference = reference;
    }
    if (taxOverridden) {
      payload.cgstAmount = Number((Number.isFinite(cgstNum) ? cgstNum : 0).toFixed(2));
      payload.sgstAmount = Number((Number.isFinite(sgstNum) ? sgstNum : 0).toFixed(2));
    }
    payBooking.mutate(payload);
  }

  async function goToStep(target: number) {
    if (billingLocked) return;
    if (target < 1 || target > 3 || target >= step) return;
    if (step === 3 && target < 3 && bookingId && bookingStatus === "READY_FOR_BILLING") {
      try {
        const b = await api.reopenBooking(bookingId);
        setBookingStatus(b.status);
      } catch (e) {
        setError(e instanceof Error ? e.message : tCommon("failed"));
        return;
      }
    }
    setCartSheetOpen(false);
    setAddedToast(null);
    setStep(target as Step);
    if (bookingId && target < 3) {
      router.replace(`/manager/walk-in?bookingId=${bookingId}&edit=1`);
    }
  }

  async function lookupCustomer(rawPhone: string) {
    const normalized = normalizeIndianMobile(rawPhone);
    if (!normalized) return;
    if (lookupPhoneRef.current === normalized && lookupState === "done") return;
    lookupPhoneRef.current = normalized;
    setLookupState("loading");
    setError("");
    try {
      const c = await api.findCustomerByPhone(normalized);
      setCustomerId(c.id);
      setCustomerName(c.name);
      setSociety(c.society || society);
      setFlat(c.flatUnit || "");
    } catch {
      setCustomerId("");
      setMembership(null);
    } finally {
      setLookupState("done");
    }
  }

  useEffect(() => {
    if (bookingId) return;
    if (digitsOnly(phone).length === 10 && isValidIndianMobile(phone)) {
      void lookupCustomer(phone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once phone reaches a valid 10-digit length
  }, [phone, bookingId]);

  function applyRecentCustomer(rc: RecentCustomer) {
    setPhone(rc.phone);
    setCustomerName(rc.name);
    setCustomerId(rc.customerId || "");
    setSociety(rc.society || society);
    setFlat(rc.flat || "");
    setPendingMembershipPlanId("");
    setError("");
  }

  const phoneValid = isValidIndianMobile(phone);
  const continueCustomerDisabled = !phoneValid || !customerName.trim() || saving;

  async function continueFromCustomerStep() {
    setError("");
    const normalized = normalizeIndianMobile(phone);
    if (!normalized || !customerName.trim()) {
      setError(t("phoneInvalid"));
      return;
    }
    if (bookingId) {
      setStep(2);
      return;
    }
    try {
      let id = customerId;
      if (!id) {
        const c = await api.createCustomer({ name: customerName, phone: normalized, society, flatUnit: flat });
        id = c.id;
        setCustomerId(id);
      }
      pushRecentCustomer(branchId, { phone: normalized, name: customerName, customerId: id, society, flat });
      setRecentCustomers(getRecentCustomers(branchId));
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : tCommon("failed"));
    }
  }

  function defaultStaffId(currentCart: CartItem[]): string {
    if (preferredStaffId && staff.some((st) => st.id === preferredStaffId)) return preferredStaffId;
    const lastUsed = [...currentCart].reverse().find((c) => c.staffId)?.staffId;
    if (lastUsed && staff.some((st) => st.id === lastUsed)) return lastUsed;
    if (staff.length > 0) return staff[0].id;
    return "";
  }

  function addService(s: BranchServiceItem) {
    setCart((prev) => [
      ...prev,
      {
        branchServiceId: s.id,
        serviceName: s.serviceName,
        basePrice: s.price,
        priceExtra: 0,
        variablePricing: !!s.variablePricing,
        staffId: defaultStaffId(prev),
      },
    ]);
    pushRecentService(branchId, s.id);
    setRecentServiceIds(getRecentServiceIds(branchId));
    setAddedToast(s.serviceName);
  }

  function applyStylistToAll(staffId: string) {
    if (!staffId) return;
    setCart((prev) => prev.map((c) => ({ ...c, staffId })));
  }

  function toggleFavorite(serviceId: string) {
    setFavoriteServiceIds(toggleFavoriteService(branchId, serviceId));
  }

  function removeFromCart(idx: number) {
    setCart(cart.filter((_, i) => i !== idx));
  }

  function updateStaff(idx: number, staffId: string) {
    const next = [...cart];
    next[idx].staffId = staffId;
    setCart(next);
  }

  function updatePriceExtra(idx: number, raw: string) {
    const extra = Math.max(0, Number(raw) || 0);
    setCart((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], priceExtra: extra };
      return next;
    });
  }

  function toLinePayload(items: CartItem[]) {
    return items.map((c) => {
      const total = cartLinePrice(c);
      const payload: { branchServiceId: string; staffId: string; quantity: number; unitPrice?: number } = {
        branchServiceId: c.branchServiceId,
        staffId: c.staffId,
        quantity: 1,
      };
      if (c.variablePricing && total > c.basePrice) {
        payload.unitPrice = total;
      }
      return payload;
    });
  }

  function discountPayload() {
    const discountValue = Number(billDiscountValue);
    const hasManual =
      !!billDiscountType &&
      Number.isFinite(discountValue) &&
      discountValue > 0 &&
      !selectedCouponId &&
      !selectedOfferId;
    return hasManual
      ? {
          billDiscountType: billDiscountType as "FLAT" | "PERCENT",
          billDiscountValue: discountValue,
        }
      : {};
  }

  async function persistServices(keepOpen: boolean): Promise<Booking> {
    if (cart.length === 0) {
      throw new Error(t("cartEmpty"));
    }

    let workingCart = cart;
    if (staff.length > 0 && cart.some((c) => !c.staffId)) {
      workingCart = cart.map((c) => (c.staffId ? c : { ...c, staffId: defaultStaffId(cart) }));
      setCart(workingCart);
    }
    if (workingCart.some((c) => !c.staffId)) {
      throw new Error(t("assignStylistError"));
    }

    if (bookingId) {
      await api.updateBookingLines(bookingId, toLinePayload(workingCart));
      const synced = await api.setPendingMembershipPlan(bookingId, pendingMembershipPlanId || null);
      if (!keepOpen && synced.status !== "READY_FOR_BILLING") {
        return api.markBookingReadyForBilling(bookingId);
      }
      if (keepOpen && synced.status === "READY_FOR_BILLING") {
        return api.reopenBooking(bookingId);
      }
      return synced;
    }

    return api.createBooking({
      branchId,
      customerId,
      lines: toLinePayload(workingCart),
      couponId: selectedCouponId || undefined,
      offerId: selectedOfferId || undefined,
      keepOpen,
      pendingMembershipPlanId: pendingMembershipPlanId || undefined,
      ...discountPayload(),
    });
  }

  async function saveOpenVisit() {
    setError("");
    setSaving(true);
    try {
      const b = await persistServices(true);
      hydrateFromBooking(b);
      clearWalkInDraft(branchId);
      await refetchOpenVisits();
      setScreen("hub");
      setStep(1);
      router.replace("/manager/walk-in");
    } catch (e) {
      setError(e instanceof Error ? e.message : tCommon("failed"));
    } finally {
      setSaving(false);
    }
  }

  async function proceedToBill() {
    setError("");
    setSaving(true);
    try {
      const b = await persistServices(false);
      hydrateFromBooking(b);
      clearWalkInDraft(branchId);
      setStep(3);
      router.replace(`/manager/walk-in?bookingId=${b.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : tCommon("failed"));
    } finally {
      setSaving(false);
    }
  }

  function onCouponChange(id: string) {
    setSelectedCouponId(id);
    setSelectedOfferId("");
    if (id) {
      setBillDiscountType("");
      setBillDiscountValue("");
    }
    if (bookingId) {
      if (!id) applyPromo.mutate({ clearPromo: true });
      else applyPromo.mutate({ couponId: id, offerId: null });
    }
  }

  function onOfferChange(id: string) {
    setSelectedOfferId(id);
    setSelectedCouponId("");
    if (id) {
      setBillDiscountType("");
      setBillDiscountValue("");
    }
    if (bookingId) {
      if (!id) applyPromo.mutate({ clearPromo: true });
      else applyPromo.mutate({ offerId: id, couponId: null });
    }
  }

  function applyManualDiscount() {
    const value = Number(billDiscountValue);
    if (!billDiscountType || !Number.isFinite(value) || value <= 0) {
      setError(t("manualDiscountInvalid"));
      return;
    }
    setSelectedCouponId("");
    setSelectedOfferId("");
    if (!bookingId) return;
    applyBillDiscount.mutate({
      billDiscountType: billDiscountType as "FLAT" | "PERCENT",
      billDiscountValue: value,
    });
  }

  function clearManualDiscount() {
    setBillDiscountType("");
    setBillDiscountValue("");
    if (bookingId) applyBillDiscount.mutate({ clearDiscount: true });
  }

  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((s, c) => s + cartLinePrice(c), 0);
    const tax = cart.reduce((s, c) => {
      const rate = servicesById.get(c.branchServiceId)?.gstRate ?? 0;
      return s + (cartLinePrice(c) * rate) / 100;
    }, 0);
    return { subtotal, estimatedGrand: subtotal + tax };
  }, [cart, servicesById]);
  const cartHasFreshBill = !!billPreview && (billPreview.lines?.length ?? 0) === cart.length;

  const promoLocked = !!selectedCouponId || !!selectedOfferId;
  const manualDiscountActive = !!billDiscountType && Number(billDiscountValue) > 0;
  const stylistsRequired = staff.length > 0;
  const stylistsComplete = !stylistsRequired || cart.every((c) => !!c.staffId);
  const cartTotalDisplay = formatMoney(
    cartHasFreshBill && billPreview ? billPreview.grandTotal : cartTotals.estimatedGrand,
    localeKit
  );

  if (screen === "hub") {
    return (
      <div className="space-y-4 w-full max-w-6xl mx-auto min-w-0 max-w-full">
        <PageHeader
          title={t("visitsTitle")}
          subtitle={t("visitsSubtitle")}
          action={
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Link
                href="/manager/schedule"
                className={`${btnSecondary} py-2.5 px-3 text-sm flex-1 sm:flex-none touch-manipulation justify-center min-h-11`}
              >
                {t("checkFloor")}
              </Link>
              <button
                type="button"
                onClick={startNewVisit}
                className={`${btnPrimary} py-2.5 px-4 flex-1 sm:flex-none touch-manipulation justify-center min-h-11`}
              >
                <UserPlus className="w-4 h-4" />
                {t("newVisit")}
              </button>
            </div>
          }
        />
        <MissionStrip />

        <SegmentedControl
          options={[
            { id: "open", label: t("tabOpen", { count: openVisits.length }) },
            { id: "history", label: t("tabHistory") },
          ]}
          value={hubTab}
          onChange={(v) => setVisitsTab(v as HubTab)}
        />

        {error && <AlertBanner variant="error">{error}</AlertBanner>}

        {hubTab === "open" && draftOffer && (
          <AlertBanner variant="info">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
              <div>
                <p className="font-semibold">{t("draftAvailable")}</p>
                {draftOffer.customerName && (
                  <p className="text-xs opacity-80 mt-0.5">
                    {draftOffer.customerName} · {draftOffer.cart.length} {t("cart", { count: draftOffer.cart.length })}
                  </p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button type="button" onClick={acceptDraft} className={`${btnPrimary} py-2 px-3 text-sm min-h-11`}>
                  {t("restoreDraft")}
                </button>
                <button type="button" onClick={dismissDraft} className={`${btnSecondary} py-2 px-3 text-sm min-h-11`}>
                  {t("dismissDraft")}
                </button>
              </div>
            </div>
          </AlertBanner>
        )}

        {hubTab === "history" ? (
          <BookingsHistoryPanel embedded onNewVisit={startNewVisit} wizardBaseHref="/manager/walk-in" />
        ) : (
          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  {t("openVisits")}
                </p>
                <p className="text-sm text-[var(--text-secondary)] mt-0.5">{t("openVisitsHint")}</p>
              </div>
              <span className="text-sm font-semibold text-[var(--text-primary)]">{openVisits.length}</span>
            </div>

            {openVisitsLoading && (
              <div className="space-y-2" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-20 rounded-xl bg-[var(--surface-muted)] animate-pulse" />
                ))}
              </div>
            )}

            {!openVisitsLoading && openVisits.length === 0 && (
              <EmptyState
                title={t("noOpenVisits")}
                description={t("noOpenVisitsHint")}
                action={
                  <button type="button" onClick={startNewVisit} className={`${btnPrimary} min-h-12`}>
                    <UserPlus className="w-4 h-4" />
                    {t("newVisit")}
                  </button>
                }
              />
            )}

            {!openVisitsLoading && openVisits.length > 0 && (
              <div className="space-y-2">
                {openVisits.map((v) => (
                  <div
                    key={v.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-[var(--text-primary)] truncate">{v.customerName}</p>
                        <StatusBadge status={v.status} />
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        {v.customerPhone} · {formatTenantDateTime(v.createdAt, localeKit)}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-1 truncate">
                        {v.lines?.map((l) => l.serviceName).join(", ") || "—"}
                      </p>
                    </div>
                    <div className="flex items-stretch sm:items-center gap-2 shrink-0 w-full sm:w-auto">
                      <p className="font-bold text-[var(--brand-text)] sm:mr-2 self-center">
                        {v.billPreview ? formatCurrency(v.billPreview.grandTotal, localeKit) : "—"}
                      </p>
                      {v.status === "READY_FOR_BILLING" ? (
                        <button
                          type="button"
                          onClick={() => void openVisit(v.id, { preferBill: true })}
                          className={`${btnPrimary} py-2 px-3 text-sm min-h-11 flex-1 sm:flex-none justify-center`}
                        >
                          <Receipt className="w-4 h-4" />
                          {t("billNow")}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void openVisit(v.id)}
                          className={`${btnSecondary} py-2 px-3 text-sm min-h-11 flex-1 sm:flex-none justify-center`}
                        >
                          <Clock className="w-4 h-4" />
                          {t("continueVisit")}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-6xl mx-auto pb-[max(0.5rem,env(safe-area-inset-bottom))] min-w-0 max-w-full">
      <PageHeader
        title={bookingId ? t("editVisit") : t("title")}
        subtitle={customerName || user?.branchName}
        action={
          !billingLocked ? (
            <button
              type="button"
              onClick={() => {
                setScreen("hub");
                router.replace("/manager/walk-in");
                void refetchOpenVisits();
              }}
              className={`${btnSecondary} py-2 px-3 text-sm min-h-11`}
            >
              {t("backToOpenVisits")}
            </button>
          ) : undefined
        }
      />

      <div className="hidden md:block">
        <WizardSteps steps={steps} current={step} onStepSelect={billingLocked ? undefined : goToStep} />
      </div>
      <WalkInCompactSteps steps={steps} current={step} onStepSelect={billingLocked ? undefined : goToStep} />
      {error && <AlertBanner variant="error">{error}</AlertBanner>}
      {draftRestoredNotice && step === 1 && (
        <AlertBanner variant="info">{t("draftRestored")}</AlertBanner>
      )}
      {bookingId && !billingLocked && (
        <p className="text-xs text-[var(--text-secondary)]">
          {t("visitStatus", { status: bookingStatus || "IN_PROGRESS" })}
        </p>
      )}

      {step === 1 && (
        <Card className="space-y-4">
          {!bookingId && recentCustomers.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                {t("recentCustomers")}
              </p>
              <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain max-w-full min-w-0 pb-0.5 -mx-0.5 px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {recentCustomers.map((rc) => (
                  <button
                    key={rc.phone}
                    type="button"
                    onClick={() => applyRecentCustomer(rc)}
                    className="shrink-0 min-w-[9rem] max-w-[12rem] text-left px-3 py-2.5 min-h-12 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--brand)] transition touch-manipulation"
                  >
                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{rc.name}</p>
                    <p className="text-[11px] text-[var(--text-tertiary)] truncate">{rc.phone}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <input
              placeholder={t("phonePlaceholder")}
              value={phone}
              onChange={(e) => setPhone(digitsOnly(e.target.value))}
              onBlur={() => {
                if (!bookingId) void lookupCustomer(phone);
              }}
              inputMode="numeric"
              maxLength={13}
              className={inputClass}
              disabled={!!bookingId}
            />
            {phone.length > 0 && !phoneValid && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{t("phoneInvalid")}</p>
            )}
            {lookupState === "loading" && (
              <p className="text-xs text-[var(--text-tertiary)] mt-1">{tCommon("loading")}</p>
            )}
          </div>
          <input
            placeholder={t("namePlaceholder")}
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className={inputClass}
            disabled={!!bookingId}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <details className="sm:col-span-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/40 px-3 py-2">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--text-secondary)] touch-manipulation py-1">
                {t("addAddressOptional")}
              </summary>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 pb-1">
                <input
                  placeholder={t("societyPlaceholder")}
                  value={society}
                  onChange={(e) => setSociety(e.target.value)}
                  className={inputClass}
                  disabled={!!bookingId}
                />
                <input
                  placeholder={t("flatPlaceholder")}
                  value={flat}
                  onChange={(e) => setFlat(e.target.value)}
                  className={inputClass}
                  disabled={!!bookingId}
                />
              </div>
            </details>
          </div>

          {membership && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
              <p className="font-semibold flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                {t("memberBadge", {
                  plan: membership.planName || "Member",
                  percent: membership.benefitPercent ?? 10,
                })}
              </p>
              <p className="text-xs mt-1">
                {membership.cardNumber} · {t("validUntil", { date: membership.endsOn })}
              </p>
            </div>
          )}

          <button
            onClick={() => void continueFromCustomerStep()}
            disabled={continueCustomerDisabled}
            className={`${btnPrimary} w-full min-h-12`}
          >
            {t("continueServices")}
          </button>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-3 min-w-0">
          {addedToast && (
            <div
              role="status"
              className="fixed left-1/2 top-[calc(3.5rem+env(safe-area-inset-top,0px)+0.75rem)] z-50 -translate-x-1/2 max-w-[min(100vw-2rem,20rem)] rounded-xl bg-[var(--text-primary)] px-4 py-2.5 text-sm font-medium text-[var(--surface)] shadow-lg animate-in fade-in"
            >
              {t("serviceAdded", { name: addedToast })}
            </div>
          )}

          <WalkInCustomerChip name={customerName} phone={phone} onEdit={() => goToStep(1)} />

          {!membership && customerId && (
            <WalkInMembershipSavingsBanner
              customerName={customerName}
              cart={cart}
              servicesById={servicesById}
              localeKit={localeKit}
            />
          )}

          {membership && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
              {t("memberAutoApply", { percent: membership.benefitPercent ?? 10 })}
            </div>
          )}

          <div className="flex flex-col md:flex-row md:gap-4 md:items-start min-w-0">
            <div className="flex-1 min-w-0 flex flex-col min-h-[calc(100dvh-17rem)] md:min-h-[calc(100dvh-12rem)] max-h-[calc(100dvh-17rem)] md:max-h-[calc(100dvh-10rem)]">
              <WalkInServiceCatalog
                serviceQuery={serviceQuery}
                onServiceQueryChange={setServiceQuery}
                recentServices={recentServices}
                favoriteServices={favoriteServices}
                favoriteServiceIds={favoriteServiceIds}
                topCategories={topCategories}
                catalogTop={catalogTop}
                onCatalogTopChange={setCatalogTop}
                filteredServices={filteredServices}
                localeKit={localeKit}
                onAddService={addService}
                onToggleFavorite={toggleFavorite}
              />
            </div>

            <div className="hidden md:block w-full md:w-[min(22rem,36%)] shrink-0 self-start">
              <WalkInCartPanel
                variant="panel"
                cart={cart}
                staff={staff}
                localeKit={localeKit}
                estimatedGrand={cartTotals.estimatedGrand}
                cartHasFreshBill={cartHasFreshBill}
                billPreview={billPreview}
                saving={saving}
                stylistsRequired={stylistsRequired}
                stylistsComplete={stylistsComplete}
                onRemove={removeFromCart}
                onUpdateStaff={updateStaff}
                onApplyStylistToAll={applyStylistToAll}
                onUpdatePriceExtra={updatePriceExtra}
                onSaveOpen={() => void saveOpenVisit()}
                onProceedToBill={() => void proceedToBill()}
              />
            </div>
          </div>

          <div className="md:hidden">
            {cartSheetOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40 bg-black/45"
                  aria-label={tCommon("close")}
                  onClick={() => setCartSheetOpen(false)}
                />
                <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[min(88dvh,640px)] flex-col rounded-t-2xl border-t border-[var(--border)] bg-[var(--surface)] shadow-2xl">
                  <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3 shrink-0">
                    <p className="font-bold text-[var(--text-primary)]">{t("viewCart")}</p>
                    <button
                      type="button"
                      onClick={() => setCartSheetOpen(false)}
                      className="p-2 rounded-lg hover:bg-[var(--surface-muted)] touch-manipulation"
                      aria-label={tCommon("close")}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="overflow-y-auto overscroll-contain px-3 py-3 min-h-0 flex-1">
                    <WalkInCartPanel
                      variant="sheet"
                      cart={cart}
                      staff={staff}
                      localeKit={localeKit}
                      estimatedGrand={cartTotals.estimatedGrand}
                      cartHasFreshBill={cartHasFreshBill}
                      billPreview={billPreview}
                      saving={saving}
                      stylistsRequired={stylistsRequired}
                      stylistsComplete={stylistsComplete}
                      onRemove={removeFromCart}
                      onUpdateStaff={updateStaff}
                      onApplyStylistToAll={applyStylistToAll}
                      onUpdatePriceExtra={updatePriceExtra}
                      onSaveOpen={() => void saveOpenVisit()}
                      onProceedToBill={() => void proceedToBill()}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(15,23,42,0.12)]">
              {cart.length === 0 ? (
                <p className="text-center text-sm text-[var(--text-tertiary)] py-2">{t("cartEmpty")}</p>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setCartSheetOpen(true)}
                    className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/60 px-3 py-2.5 touch-manipulation"
                  >
                    <ShoppingBag className="w-5 h-5 shrink-0 text-[var(--brand-text)]" />
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-xs font-semibold text-[var(--text-secondary)]">
                        {t("cart", { count: cart.length })}
                      </p>
                      <p className="text-base font-bold text-[var(--text-primary)] tabular-nums truncate">
                        {cartTotalDisplay}
                      </p>
                    </div>
                    <ChevronUp className="w-5 h-5 shrink-0 text-[var(--text-tertiary)]" />
                  </button>
                  {!stylistsComplete && stylistsRequired && (
                    <p className="text-xs text-amber-700 dark:text-amber-400 px-1">{t("assignStylistError")}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => void proceedToBill()}
                    disabled={cart.length === 0 || saving || (stylistsRequired && !stylistsComplete)}
                    className={`${btnPrimary} w-full min-h-12`}
                  >
                    {saving ? tCommon("processing") : t("continueBill")}
                  </button>
                </div>
              )}
            </div>
            <div className="h-[calc(7.5rem+env(safe-area-inset-bottom))]" aria-hidden />
          </div>
        </div>
      )}

      {step === 3 && billPreview && (
        <div className="space-y-4 max-w-3xl xl:max-w-4xl mx-auto w-full min-w-0 md:pb-6">
          <div className="hero-banner rounded-2xl p-4 sm:p-5 shadow-lg">
            <p className="hero-muted text-xs font-semibold uppercase tracking-wider">{customerName || t("namePlaceholder")}</p>
            <p className="text-3xl sm:text-4xl font-bold tabular-nums mt-1">{formatMoney(displayGrandTotal, localeKit)}</p>
            <p className="hero-subtitle text-sm mt-1">{tCommon("grandTotal")}</p>
          </div>

          {branch?.gstin && (
            <p className="text-xs text-[var(--text-tertiary)]">{t("gstinLabel", { gstin: branch.gstin })}</p>
          )}

          {!billingLocked && membership && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2.5 text-sm text-emerald-800 dark:text-emerald-200">
              {t("memberAutoApply", { percent: membership.benefitPercent ?? 10 })}
            </div>
          )}

          {!billingLocked && !membership && customerId && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
              <WalkInMembershipPicker
                value={pendingMembershipPlanId}
                onChange={setPendingMembershipPlanId}
                disabled={!bookingId || saving}
              />
            </div>
          )}

          {!billingLocked && (
            <Card className="p-0 overflow-hidden">
              <details className="group" open={!!selectedCouponId || !!selectedOfferId || manualDiscountActive}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3.5 font-semibold text-sm touch-manipulation">
                  <span>{t("adjustments")}</span>
                  <ChevronDown className="w-4 h-4 shrink-0 transition group-open:rotate-180" />
                </summary>
                <div className="border-t border-[var(--border)] px-4 py-4">
                  <WalkInPromoAdjustments
                    coupons={coupons}
                    offers={offers}
                    localeKit={localeKit}
                    selectedCouponId={selectedCouponId}
                    selectedOfferId={selectedOfferId}
                    billDiscountType={billDiscountType}
                    billDiscountValue={billDiscountValue}
                    promoLocked={promoLocked}
                    manualDiscountActive={manualDiscountActive}
                    onCouponChange={onCouponChange}
                    onOfferChange={onOfferChange}
                    onBillDiscountTypeChange={setBillDiscountType}
                    onBillDiscountValueChange={setBillDiscountValue}
                    onApplyManualDiscount={applyManualDiscount}
                    onClearManualDiscount={clearManualDiscount}
                    applyPending={applyBillDiscount.isPending}
                  />
                </div>
              </details>
            </Card>
          )}

          <Card className="space-y-5">
            <div>
              <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                {t("servicesReview")}
              </p>
              <ul className="space-y-2">
                {(billPreview.lines && billPreview.lines.length > 0
                  ? billPreview.lines.map((line, idx) => {
                      const stylist = cart[idx]?.staffId
                        ? staff.find((s) => s.id === cart[idx].staffId)?.name
                        : undefined;
                      const qty = line.quantity || 1;
                      const linePrice = line.unitPrice * qty;
                      return (
                        <li
                          key={line.lineItemId || `${line.serviceName}-${idx}`}
                          className="flex justify-between gap-3 items-start border-b border-[var(--border)]/60 pb-2 last:border-0 last:pb-0"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-[var(--text-primary)] truncate">
                              {line.serviceName}
                              {qty > 1 ? ` × ${qty}` : ""}
                            </p>
                            {stylist && (
                              <p className="text-xs text-[var(--text-tertiary)]">{t("stylist", { name: stylist })}</p>
                            )}
                          </div>
                          <span className="font-semibold text-[var(--text-primary)] shrink-0 tabular-nums">
                            {formatMoney(linePrice, localeKit)}
                          </span>
                        </li>
                      );
                    })
                  : (() => {
                      const fee = membershipFeeServiceLine(billPreview);
                      const items = cart.map((item, idx) => ({ item, idx }));
                      return (
                        <>
                          {items.map(({ item, idx }) => {
                            const stylist = staff.find((s) => s.id === item.staffId)?.name;
                            return (
                              <li
                                key={`${item.branchServiceId}-${idx}`}
                                className="flex justify-between gap-3 items-start border-b border-[var(--border)]/60 pb-2 last:border-0 last:pb-0"
                              >
                                <div className="min-w-0">
                                  <p className="font-medium text-[var(--text-primary)] truncate">{item.serviceName}</p>
                                  {stylist && (
                                    <p className="text-xs text-[var(--text-tertiary)]">{t("stylist", { name: stylist })}</p>
                                  )}
                                </div>
                                <span className="font-semibold text-[var(--text-primary)] shrink-0 tabular-nums">
                                  {formatMoney(cartLinePrice(item), localeKit)}
                                </span>
                              </li>
                            );
                          })}
                          {fee && (
                            <li className="flex justify-between gap-3 items-start border-b border-[var(--border)]/60 pb-2 last:border-0 last:pb-0">
                              <p className="font-medium text-[var(--text-primary)] truncate">{fee.name}</p>
                              <span className="font-semibold text-[var(--text-primary)] shrink-0 tabular-nums">
                                {formatMoney(fee.amount, localeKit)}
                              </span>
                            </li>
                          )}
                        </>
                      );
                    })())}
              </ul>
            </div>

            <div className="pt-1 border-t border-[var(--border)]">
              <BillBreakdownRows
                preview={billPreview}
                localeKit={localeKit}
                showTaxable
                cgstDisplay={Number.isFinite(cgstNum) ? cgstNum : 0}
                sgstDisplay={Number.isFinite(sgstNum) ? sgstNum : 0}
                hideGrandTotal
                className="space-y-2"
              />

              {!billingLocked && (
                <details
                  className="group pt-1"
                  onToggle={(e) => setTaxAdvanced(e.currentTarget.open)}
                >
                  <summary className="flex items-center justify-between cursor-pointer select-none list-none text-xs font-semibold text-[var(--brand-text)]">
                    <span>{t("advancedTax")}</span>
                    <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-2 space-y-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] p-3">
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {taxOverridden ? t("taxOverrideHint") : t("autoTaxHint")}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="space-y-1">
                        <span className="text-[11px] font-semibold text-[var(--text-secondary)]">CGST</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          value={cgstInput}
                          onChange={(e) => {
                            setCgstInput(e.target.value);
                            setTaxOverridden(true);
                          }}
                          aria-label="CGST"
                          className={`${inputClass} text-right py-2.5 px-2 min-h-11`}
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[11px] font-semibold text-[var(--text-secondary)]">SGST</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          value={sgstInput}
                          onChange={(e) => {
                            setSgstInput(e.target.value);
                            setTaxOverridden(true);
                          }}
                          aria-label="SGST"
                          className={`${inputClass} text-right py-2.5 px-2 min-h-11`}
                        />
                      </label>
                    </div>
                    {taxOverridden && billPreview && (
                      <button
                        type="button"
                        className="text-xs font-semibold text-[var(--brand-text)] hover:underline"
                        onClick={() => {
                          setCgstInput(String(billPreview.cgstAmount ?? 0));
                          setSgstInput(String(billPreview.sgstAmount ?? 0));
                          setTaxOverridden(false);
                        }}
                      >
                        {t("resetTax")}
                      </button>
                    )}
                    {!taxValid && (
                      <p className="text-xs text-amber-700 dark:text-amber-400">{t("taxMustBePositive")}</p>
                    )}
                  </div>
                </details>
              )}

              <div className="flex justify-between font-bold text-lg pt-2 border-t border-[var(--border)]">
                <span>{tCommon("grandTotal")}</span>
                <span className="text-[var(--brand-text)]">{formatMoney(displayGrandTotal, localeKit)}</span>
              </div>
            </div>

          {!billingLocked && (
            <>
              <button type="button" onClick={() => goToStep(2)} className={`${btnSecondary} w-full min-h-11`}>
                {t("addMoreServices")}
              </button>
              <div>
                <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                  {t("paymentMode")}
                </p>
                <SegmentedControl<PaymentMode>
                  options={[
                    { id: "CASH", label: t("cash") },
                    { id: "UPI", label: t("upi") },
                    { id: "CARD", label: t("card") },
                    { id: "SPLIT", label: t("split") },
                  ]}
                  value={paymentMode}
                  onChange={setPaymentMode}
                />
              </div>
              {paymentMode !== "CASH" && paymentMode !== "SPLIT" && (
                <input
                  placeholder={t("txnReference")}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className={inputClass}
                />
              )}
              {paymentMode === "SPLIT" && (
                <div className="space-y-2">
                  {splitRows.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-1 min-[480px]:grid-cols-[7.5rem_1fr] lg:grid-cols-[7.5rem_minmax(0,1fr)_minmax(0,1fr)] gap-2">
                      <select
                        value={row.mode}
                        onChange={(e) =>
                          setSplitRows((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, mode: e.target.value as SplitRow["mode"] } : r))
                          )
                        }
                        className={`${selectClass} min-h-11`}
                      >
                        <option value="CASH">{t("cash")}</option>
                        <option value="UPI">{t("upi")}</option>
                        <option value="CARD">{t("card")}</option>
                      </select>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        placeholder={t("splitRowAmount")}
                        value={row.amount}
                        onChange={(e) =>
                          setSplitRows((prev) => prev.map((r, i) => (i === idx ? { ...r, amount: e.target.value } : r)))
                        }
                        className={`${inputClass} min-h-11`}
                      />
                      {row.mode !== "CASH" && (
                        <input
                          placeholder={t("txnReference")}
                          value={row.reference}
                          onChange={(e) =>
                            setSplitRows((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, reference: e.target.value } : r))
                            )
                          }
                          className={`${inputClass} min-h-11 min-[480px]:col-span-2 lg:col-span-1`}
                        />
                      )}
                    </div>
                  ))}
                  {!splitValid && splitSum > 0 && (
                    <p className="text-xs text-amber-700 dark:text-amber-400">{t("splitSumMismatch")}</p>
                  )}
                </div>
              )}
            </>
          )}

          {paymentSuccess && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2.5 space-y-2">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{paymentSuccess}</p>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">{t("receiptShareHint")}</p>
              {receiptQueued && (
                <p className="text-[11px] text-emerald-700/60 dark:text-emerald-400/60">{t("receiptQueuedHint")}</p>
              )}
              {reviewInvitationUrl && (
                <ReviewInvitationPanel
                  reviewUrl={reviewInvitationUrl}
                  title={t("reviewInviteTitle")}
                  subtitle={t("reviewInviteSubtitle")}
                  copyLabel={t("reviewCopyLink")}
                  copiedLabel={t("reviewCopiedLink")}
                  shareLabel={t("reviewShareLink")}
                  submittedRating={reviewSubmittedRating}
                />
              )}
            </div>
          )}

          {billingLocked ? (
            <div className="space-y-2">
              {paidInvoiceId && (
                <InvoicePdfButtons
                  invoiceId={paidInvoiceId}
                  shareText={t("shareBillMessage", { name: customerName || "Customer" })}
                  shareLabel={t("shareBill")}
                  downloadLabel={t("downloadBill")}
                  processingLabel={tCommon("processing")}
                  primaryClassName={`${btnPrimary} w-full py-3.5 min-h-12 justify-center touch-manipulation`}
                  secondaryClassName={`${btnSecondary} w-full min-h-11 justify-center touch-manipulation`}
                  onError={setError}
                />
              )}
              <button
                type="button"
                onClick={() => router.push("/manager/walk-in?tab=history")}
                className={`${btnSecondary} w-full min-h-11`}
              >
                {t("viewBookings")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setScreen("hub");
                  setPaidInvoiceId("");
                  setPaymentSuccess("");
                  setReviewInvitationUrl("");
                  setReviewSubmittedRating(null);
                  setBookingId("");
                  router.replace("/manager/walk-in");
                  void refetchOpenVisits();
                }}
                className={`${btnSecondary} w-full min-h-11`}
              >
                {t("done")}
              </button>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <button
                  type="button"
                  onClick={submitPayment}
                  disabled={
                    !taxValid ||
                    payBooking.isPending ||
                    applyPromo.isPending ||
                    applyBillDiscount.isPending ||
                    (paymentMode === "SPLIT" && !splitValid)
                  }
                  className={`${btnPrimary} w-full py-3.5 min-h-12 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-600/20`}
                >
                  {payBooking.isPending ? tCommon("processing") : t("collectAmount", { amount: formatMoney(displayGrandTotal, localeKit) })}
                </button>
              </div>
            </>
          )}
        </Card>

          {!billingLocked && (
            <div className="md:hidden">
              <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md px-3 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(15,23,42,0.12)]">
                <button
                  type="button"
                  onClick={submitPayment}
                  disabled={
                    !taxValid ||
                    payBooking.isPending ||
                    applyPromo.isPending ||
                    applyBillDiscount.isPending ||
                    (paymentMode === "SPLIT" && !splitValid)
                  }
                  className={`${btnPrimary} w-full py-3.5 min-h-12 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-600/20`}
                >
                  {payBooking.isPending ? tCommon("processing") : t("collectAmount", { amount: formatMoney(displayGrandTotal, localeKit) })}
                </button>
              </div>
              <div className="h-[calc(5.5rem+env(safe-area-inset-bottom))]" aria-hidden />
            </div>
          )}
        </div>
      )}

      {step === 3 && !billPreview && (
        <Card className="space-y-3">
          <div className="h-24 rounded-xl bg-[var(--surface-muted)] animate-pulse" aria-hidden />
          <button type="button" onClick={() => setStep(2)} className={`${btnSecondary} min-h-11`}>
            {t("addMoreServices")}
          </button>
        </Card>
      )}
    </div>
  );
}
