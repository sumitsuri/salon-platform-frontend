"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Trash2, Plus, CreditCard, Download, Clock, Receipt, UserPlus } from "lucide-react";
import {
  api,
  BillPreview,
  Booking,
  BranchServiceItem,
  MembershipSubscription,
  StaffItem,
} from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { formatCurrency, cn } from "@/lib/utils";
import {
  PageHeader,
  Card,
  AlertBanner,
  SegmentedControl,
  StatusBadge,
  inputClass,
  selectClass,
  btnPrimary,
  btnSecondary,
} from "@/components/ui";
import { WizardSteps } from "@/components/enterprise-ui";
import { MissionStrip } from "@/components/brand/MissionStrip";

type Screen = "hub" | "flow";
type Step = 1 | 2 | 3;
type DiscountKind = "" | "FLAT" | "PERCENT";

interface CartItem {
  branchServiceId: string;
  serviceName: string;
  price: number;
  staffId: string;
}

const OPEN_STATUSES = new Set(["DRAFT", "IN_PROGRESS", "READY_FOR_BILLING"]);

export default function WalkInPage() {
  const t = useTranslations("manager.walkIn");
  const tCommon = useTranslations("common");
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branchId || "";
  const router = useRouter();
  const searchParams = useSearchParams();
  const preferredStaffId = searchParams.get("staffId") || "";
  const queryClient = useQueryClient();

  const [screen, setScreen] = useState<Screen>("hub");
  const [step, setStep] = useState<Step>(1);
  const [phone, setPhone] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [society, setSociety] = useState(user?.branchName ?? "");
  const [flat, setFlat] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "CARD">("CASH");
  const [reference, setReference] = useState("");
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
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState("");
  const [cgstInput, setCgstInput] = useState("0");
  const [sgstInput, setSgstInput] = useState("0");
  const [saving, setSaving] = useState(false);
  const [catalogTop, setCatalogTop] = useState("");
  const [catalogSub, setCatalogSub] = useState("");
  const [serviceQuery, setServiceQuery] = useState("");

  const steps = [t("stepCustomer"), t("stepServices"), t("stepPayment")];
  const billingLocked = !!paidInvoiceId;

  const { data: services = [] } = useQuery({
    queryKey: ["services", branchId],
    queryFn: () => api.getBranchServices(branchId),
    enabled: !!branchId,
  });

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

  useEffect(() => {
    if (!catalogTop && topCategories.length > 0) {
      setCatalogTop(topCategories[0].id);
    }
  }, [catalogTop, topCategories]);

  const subCategories = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of services) {
      const parentId = s.parentCategoryId || s.categoryId || "other";
      if (catalogTop && parentId !== catalogTop) continue;
      const id = s.categoryId || "other";
      const name = s.categoryName || "Other";
      if (!map.has(id)) map.set(id, name);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [services, catalogTop]);

  useEffect(() => {
    setCatalogSub("");
  }, [catalogTop]);

  const filteredServices = useMemo(() => {
    const q = serviceQuery.trim().toLowerCase();
    return services.filter((s) => {
      const parentId = s.parentCategoryId || s.categoryId || "other";
      if (catalogTop && parentId !== catalogTop) return false;
      if (catalogSub && (s.categoryId || "other") !== catalogSub) return false;
      if (!q) return true;
      return (
        s.serviceName.toLowerCase().includes(q) ||
        (s.categoryName || "").toLowerCase().includes(q) ||
        (s.parentCategoryName || "").toLowerCase().includes(q)
      );
    });
  }, [services, catalogTop, catalogSub, serviceQuery]);

  const { data: staff = [] } = useQuery({
    queryKey: ["staff", branchId],
    queryFn: () => api.getStaff(branchId),
    enabled: !!branchId,
  });

  const { data: applicablePromos = [] } = useQuery({
    queryKey: ["applicable-promos", branchId],
    queryFn: () => api.getApplicablePromos(branchId),
    enabled: !!branchId && screen === "flow" && step >= 2,
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
      return;
    }
    api
      .getActiveMembership(customerId)
      .then((m) => setMembership(m))
      .catch(() => setMembership(null));
  }, [customerId]);

  useEffect(() => {
    // Tax is manager-entered; default both to 0 (calculated GST is not auto-applied).
    setCgstInput("0");
    setSgstInput("0");
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
      (b.lines || []).map((l) => ({
        branchServiceId: l.branchServiceId,
        serviceName: l.serviceName,
        price: l.unitPrice,
        staffId: l.staffId,
      }))
    );
    setPaidInvoiceId(b.invoiceId && b.status === "COMPLETED" ? b.invoiceId : "");
    setPaymentSuccess("");
    setError("");
  }, []);

  useEffect(() => {
    if (preferredStaffId) {
      setScreen("flow");
      setStep(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open flow once when arriving from Floor with a staff preselect
  }, []);

  const startNewVisit = useCallback(() => {
    setBookingId("");
    setBookingStatus("");
    setPhone("");
    setCustomerId("");
    setCustomerName("");
    setSociety(user?.branchName ?? "");
    setFlat("");
    setCart([]);
    setBillPreview(null);
    setSelectedCouponId("");
    setSelectedOfferId("");
    setBillDiscountType("");
    setBillDiscountValue("");
    setPaidInvoiceId("");
    setPaymentSuccess("");
    setError("");
    setStep(1);
    setScreen("flow");
    router.replace("/manager/walk-in");
  }, [router, user?.branchName]);

  const openVisit = useCallback(
    async (id: string, preferBill = false) => {
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
        if (b.status === "READY_FOR_BILLING" || preferBill) {
          setStep(3);
        } else {
          setStep(2);
        }
        router.replace(`/manager/walk-in?bookingId=${id}`);
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
    void openVisit(id);
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

  const parsedCgst = Number(cgstInput);
  const parsedSgst = Number(sgstInput);
  const taxOverrideValid =
    Number.isFinite(parsedCgst) &&
    Number.isFinite(parsedSgst) &&
    parsedCgst >= 0 &&
    parsedSgst >= 0;

  const displayGrandTotal = useMemo(() => {
    if (!billPreview) return 0;
    if (!Number.isFinite(parsedCgst) || !Number.isFinite(parsedSgst)) {
      return Number(billPreview.grandTotal) - Number(billPreview.cgstAmount) - Number(billPreview.sgstAmount);
    }
    const base =
      Number(billPreview.grandTotal) - Number(billPreview.cgstAmount) - Number(billPreview.sgstAmount);
    return Math.round((base + parsedCgst + parsedSgst) * 100) / 100;
  }, [billPreview, parsedCgst, parsedSgst]);

  const payBooking = useMutation({
    mutationFn: ({
      id,
      amount,
      cgstAmount,
      sgstAmount,
    }: {
      id: string;
      amount: number;
      cgstAmount: number;
      sgstAmount: number;
    }) =>
      api.payBooking(id, {
        mode: paymentMode,
        amount,
        reference,
        cgstAmount,
        sgstAmount,
      }),
    onSuccess: (booking) => {
      if (booking.invoiceId) setPaidInvoiceId(booking.invoiceId);
      setBookingStatus("COMPLETED");
      if (booking.receiptQueued) {
        setPaymentSuccess(t("receiptQueued", { phone: booking.customerPhone }));
      } else {
        setPaymentSuccess(t("paymentComplete"));
      }
      void queryClient.invalidateQueries({ queryKey: ["open-visits", branchId] });
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  function goToStep(target: number) {
    if (billingLocked) return;
    if (target < 1 || target > 3 || target >= step) return;
    // From payment back to services — reopen if needed
    if (step === 3 && target === 2 && bookingId && bookingStatus === "READY_FOR_BILLING") {
      void api.reopenBooking(bookingId).then((b) => setBookingStatus(b.status)).catch(() => {});
    }
    setStep(target as Step);
  }

  async function searchCustomer() {
    setError("");
    try {
      const c = await api.findCustomerByPhone(phone);
      setCustomerId(c.id);
      setCustomerName(c.name);
      setSociety(c.society || society);
      setFlat(c.flatUnit || "");
    } catch {
      setCustomerId("");
      setCustomerName("");
      setMembership(null);
    }
  }

  async function registerAndContinue() {
    setError("");
    try {
      let id = customerId;
      if (!id) {
        const c = await api.createCustomer({ name: customerName, phone, society, flatUnit: flat });
        id = c.id;
        setCustomerId(id);
      }
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : tCommon("failed"));
    }
  }

  function addService(s: BranchServiceItem) {
    const staffId =
      preferredStaffId && staff.some((st) => st.id === preferredStaffId) ? preferredStaffId : "";
    setCart([...cart, { branchServiceId: s.id, serviceName: s.serviceName, price: s.price, staffId }]);
  }

  function removeFromCart(idx: number) {
    setCart(cart.filter((_, i) => i !== idx));
  }

  function updateStaff(idx: number, staffId: string) {
    const next = [...cart];
    next[idx].staffId = staffId;
    setCart(next);
  }

  function linePayload() {
    return cart.map((c) => ({
      branchServiceId: c.branchServiceId,
      staffId: c.staffId,
      quantity: 1,
    }));
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
    if (cart.some((c) => !c.staffId)) {
      throw new Error(t("assignStylistError"));
    }
    if (cart.length === 0) {
      throw new Error(t("cartEmpty"));
    }

    if (bookingId) {
      const updated = await api.updateBookingLines(bookingId, linePayload());
      if (!keepOpen && updated.status !== "READY_FOR_BILLING") {
        return api.markBookingReadyForBilling(bookingId);
      }
      if (keepOpen && updated.status === "READY_FOR_BILLING") {
        return api.reopenBooking(bookingId);
      }
      return updated;
    }

    return api.createBooking({
      branchId,
      customerId,
      lines: linePayload(),
      couponId: selectedCouponId || undefined,
      offerId: selectedOfferId || undefined,
      keepOpen,
      ...discountPayload(),
    });
  }

  async function saveOpenVisit() {
    setError("");
    setSaving(true);
    try {
      const b = await persistServices(true);
      hydrateFromBooking(b);
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

  async function downloadPaidInvoice() {
    if (!paidInvoiceId) return;
    setDownloadingPdf(true);
    setError("");
    try {
      await api.downloadInvoicePdf(paidInvoiceId);
    } catch (e) {
      setError(e instanceof Error ? e.message : tCommon("failed"));
    } finally {
      setDownloadingPdf(false);
    }
  }

  const estimateSubtotal = cart.reduce((s, c) => s + c.price, 0);
  const estimateGrandTotal = estimateSubtotal * 1.18;
  const promoLocked = !!selectedCouponId || !!selectedOfferId;
  const manualDiscountActive = !!billDiscountType && Number(billDiscountValue) > 0;

  if (screen === "hub") {
    return (
      <div className="space-y-4">
        <PageHeader
          title={t("title")}
          subtitle={user?.branchName}
          action={
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Link href="/manager/schedule" className={`${btnSecondary} py-2.5 px-3 text-sm flex-1 sm:flex-none touch-manipulation justify-center`}>
                {t("checkFloor")}
              </Link>
              <button type="button" onClick={startNewVisit} className={`${btnPrimary} py-2.5 px-4 flex-1 sm:flex-none touch-manipulation justify-center`}>
                <UserPlus className="w-4 h-4" />
                {t("newVisit")}
              </button>
            </div>
          }
        />
        <MissionStrip />
        {error && <AlertBanner variant="error">{error}</AlertBanner>}

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

          {openVisitsLoading && <p className="text-sm text-[var(--text-secondary)]">{tCommon("loading")}</p>}
          {!openVisitsLoading && openVisits.length === 0 && (
            <div className="rounded-xl border border-dashed border-[var(--border)] px-4 py-8 text-center">
              <p className="text-sm text-[var(--text-secondary)]">{t("noOpenVisits")}</p>
              <button type="button" onClick={startNewVisit} className={`${btnPrimary} mt-4`}>
                {t("newVisit")}
              </button>
            </div>
          )}

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
                    {v.customerPhone} ·{" "}
                    {new Date(v.createdAt).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1 truncate">
                    {v.lines?.map((l) => l.serviceName).join(", ") || "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <p className="font-bold text-[var(--brand-text)] sm:mr-2">
                    {v.billPreview ? formatCurrency(v.billPreview.grandTotal) : "—"}
                  </p>
                  {v.status === "READY_FOR_BILLING" ? (
                    <button
                      type="button"
                      onClick={() => void openVisit(v.id, true)}
                      className={`${btnPrimary} py-2 px-3 text-sm`}
                    >
                      <Receipt className="w-4 h-4" />
                      {t("billNow")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void openVisit(v.id)}
                      className={`${btnSecondary} py-2 px-3 text-sm`}
                    >
                      <Clock className="w-4 h-4" />
                      {t("continueVisit")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
              className={`${btnSecondary} py-2 px-3 text-sm`}
            >
              {t("backToOpenVisits")}
            </button>
          ) : undefined
        }
      />

      <WizardSteps steps={steps} current={step} onStepSelect={billingLocked ? undefined : goToStep} />
      <MissionStrip />
      {error && <AlertBanner variant="error">{error}</AlertBanner>}
      {bookingId && !billingLocked && (
        <p className="text-xs text-[var(--text-secondary)]">
          {t("visitStatus", { status: bookingStatus || "IN_PROGRESS" })}
        </p>
      )}

      {step === 1 && (
        <Card className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              placeholder={t("phonePlaceholder")}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
              disabled={!!bookingId}
            />
            <button
              onClick={searchCustomer}
              className={`${btnSecondary} shrink-0 sm:px-5`}
              disabled={!!bookingId}
            >
              {tCommon("search")}
            </button>
          </div>
          <input
            placeholder={t("namePlaceholder")}
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className={inputClass}
            disabled={!!bookingId}
          />
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

          {customerId && !membership && !bookingId && (
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/manager/memberships?customerId=${customerId}&phone=${encodeURIComponent(phone)}&name=${encodeURIComponent(customerName)}`
                )
              }
              className={`${btnSecondary} w-full`}
            >
              {t("sellMembership")}
            </button>
          )}

          <button
            onClick={() => (bookingId ? setStep(2) : void registerAndContinue())}
            disabled={!phone || !customerName}
            className={`${btnPrimary} w-full`}
          >
            {t("continueServices")}
          </button>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {membership && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2 text-sm text-emerald-800">
              {t("memberAutoApply", { percent: membership.benefitPercent ?? 10 })}
            </div>
          )}

          <Card className="space-y-3">
            <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
              {t("applyPromo")}
            </p>
            <select
              value={selectedCouponId}
              onChange={(e) => onCouponChange(e.target.value)}
              className={selectClass}
              disabled={manualDiscountActive}
            >
              <option value="">{t("noCoupon")}</option>
              {coupons.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.name} (
                  {c.discountType === "PERCENT" ? `${c.discountValue}%` : formatCurrency(c.discountValue)})
                </option>
              ))}
            </select>
            <select
              value={selectedOfferId}
              onChange={(e) => onOfferChange(e.target.value)}
              className={selectClass}
              disabled={!!selectedCouponId || manualDiscountActive}
            >
              <option value="">{t("noOffer")}</option>
              {offers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} (
                  {o.discountType === "PERCENT" ? `${o.discountValue}%` : formatCurrency(o.discountValue)})
                </option>
              ))}
            </select>
            <p className="text-xs text-[var(--text-tertiary)]">{t("xorHint")}</p>

            <div className={cn("pt-2 border-t border-[var(--border)] space-y-2", promoLocked && "opacity-60")}>
              <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                {t("manualDiscount")}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">{t("manualDiscountHint")}</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={billDiscountType}
                  onChange={(e) => setBillDiscountType(e.target.value as DiscountKind)}
                  className={selectClass}
                  disabled={promoLocked}
                >
                  <option value="">{t("noManualDiscount")}</option>
                  <option value="PERCENT">{t("percentOff")}</option>
                  <option value="FLAT">{t("flatOff")}</option>
                </select>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  placeholder={billDiscountType === "PERCENT" ? t("percentPlaceholder") : t("amountPlaceholder")}
                  value={billDiscountValue}
                  onChange={(e) => setBillDiscountValue(e.target.value)}
                  className={inputClass}
                  disabled={promoLocked || !billDiscountType}
                />
              </div>
            </div>
          </Card>

          <Card padding={false}>
            <div className="px-4 py-3 border-b border-[var(--border)] space-y-3">
              <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                {t("addServices")}
              </p>
              {topCategories.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 -mx-0.5 px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {topCategories.map((top) => (
                    <button
                      key={top.id}
                      type="button"
                      onClick={() => setCatalogTop(top.id)}
                      className={cn(
                        "shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition border touch-manipulation",
                        catalogTop === top.id
                          ? "bg-[var(--brand)] text-[var(--brand-on-brand)] border-transparent"
                          : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--brand)]"
                      )}
                    >
                      {top.name}
                    </button>
                  ))}
                </div>
              )}
              {subCategories.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 -mx-0.5 px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <button
                    type="button"
                    onClick={() => setCatalogSub("")}
                    className={cn(
                      "shrink-0 px-2.5 py-1 rounded-md text-[11px] font-medium transition border touch-manipulation",
                      !catalogSub
                        ? "bg-[color-mix(in_srgb,var(--brand)_14%,transparent)] text-[var(--brand-text)] border-[color-mix(in_srgb,var(--brand)_35%,transparent)]"
                        : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)]"
                    )}
                  >
                    {t("allSubcategories")}
                  </button>
                  {subCategories.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setCatalogSub(sub.id)}
                      className={cn(
                        "shrink-0 px-2.5 py-1 rounded-md text-[11px] font-medium transition border touch-manipulation",
                        catalogSub === sub.id
                          ? "bg-[color-mix(in_srgb,var(--brand)_14%,transparent)] text-[var(--brand-text)] border-[color-mix(in_srgb,var(--brand)_35%,transparent)]"
                          : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)]"
                      )}
                    >
                      {sub.name}
                    </button>
                  ))}
                </div>
              )}
              <input
                type="search"
                value={serviceQuery}
                onChange={(e) => setServiceQuery(e.target.value)}
                placeholder={t("searchServices")}
                className={`${inputClass} py-2 text-sm`}
              />
            </div>
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 max-h-[min(45vh,28rem)] overflow-y-auto overscroll-contain">
              {filteredServices.length === 0 ? (
                <p className="col-span-full text-sm text-[var(--text-secondary)] text-center py-6">
                  {t("noServicesMatch")}
                </p>
              ) : (
                filteredServices.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => addService(s)}
                    className="flex items-center justify-between gap-2 p-3 rounded-xl border border-[var(--border)] hover:border-[var(--brand)] hover:bg-[var(--brand-light)] transition text-left active:scale-[0.98] touch-manipulation min-w-0"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-[var(--text-primary)] truncate">{s.serviceName}</p>
                      <p className="text-xs text-[var(--text-tertiary)] truncate">
                        {[s.parentCategoryName, s.categoryName].filter(Boolean).join(" · ")}
                        {s.durationMinutes ? ` · ${s.durationMinutes}m` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="font-bold text-sm text-[var(--brand-text)]">{formatCurrency(s.price)}</span>
                      <Plus className="w-4 h-4 text-[var(--brand-text)]" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>

          <Card className="sticky bottom-20 lg:bottom-4 z-10 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                {t("cart", { count: cart.length })}
              </p>
              <p className="text-lg font-bold text-[var(--text-primary)]">{formatCurrency(estimateGrandTotal)}</p>
            </div>
            {cart.length === 0 ? (
              <p className="text-[var(--text-tertiary)] text-sm text-center py-4">{t("cartEmpty")}</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {cart.map((item, idx) => (
                  <div key={idx} className="p-3 bg-[var(--surface-muted)] rounded-xl border border-[var(--border)]">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-medium text-sm">{item.serviceName}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-semibold text-[var(--brand-text)]">
                          {formatCurrency(item.price)}
                        </span>
                        <button
                          onClick={() => removeFromCart(idx)}
                          className="text-[var(--text-tertiary)] hover:text-red-500 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <select
                      value={item.staffId}
                      onChange={(e) => updateStaff(idx, e.target.value)}
                      className={`${selectClass} mt-2 py-2`}
                    >
                      <option value="">{t("selectStylist")}</option>
                      {staff.map((st: StaffItem) => (
                        <option key={st.id} value={st.id}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={() => void saveOpenVisit()}
                disabled={cart.length === 0 || saving}
                className={`${btnSecondary} w-full`}
              >
                {saving ? tCommon("processing") : t("saveOpenVisit")}
              </button>
              <button
                type="button"
                onClick={() => void proceedToBill()}
                disabled={cart.length === 0 || saving}
                className={`${btnPrimary} w-full`}
              >
                {saving ? tCommon("processing") : t("continueBill")}
              </button>
            </div>
            <p className="text-[11px] text-[var(--text-tertiary)] text-center">{t("saveOpenVisitHint")}</p>
          </Card>
        </div>
      )}

      {step === 3 && billPreview && (
        <Card className="space-y-5">
          {!billingLocked && (
            <>
              <div className="space-y-3">
                <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  {t("applyPromo")}
                </p>
                <select
                  value={selectedCouponId}
                  onChange={(e) => onCouponChange(e.target.value)}
                  className={selectClass}
                  disabled={manualDiscountActive || applyBillDiscount.isPending}
                >
                  <option value="">{t("noCoupon")}</option>
                  {coupons.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} · {c.name}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedOfferId}
                  onChange={(e) => onOfferChange(e.target.value)}
                  className={cn(selectClass, selectedCouponId && "opacity-60")}
                  disabled={!!selectedCouponId || manualDiscountActive || applyBillDiscount.isPending}
                >
                  <option value="">{t("noOffer")}</option>
                  {offers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={cn("space-y-2", promoLocked && "opacity-60")}>
                <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  {t("manualDiscount")}
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={billDiscountType}
                    onChange={(e) => setBillDiscountType(e.target.value as DiscountKind)}
                    className={selectClass}
                    disabled={promoLocked}
                  >
                    <option value="">{t("noManualDiscount")}</option>
                    <option value="PERCENT">{t("percentOff")}</option>
                    <option value="FLAT">{t("flatOff")}</option>
                  </select>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    placeholder={billDiscountType === "PERCENT" ? t("percentPlaceholder") : t("amountPlaceholder")}
                    value={billDiscountValue}
                    onChange={(e) => setBillDiscountValue(e.target.value)}
                    className={inputClass}
                    disabled={promoLocked || !billDiscountType}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={applyManualDiscount}
                    disabled={promoLocked || !billDiscountType || applyBillDiscount.isPending}
                    className={`${btnSecondary} flex-1`}
                  >
                    {t("applyManualDiscount")}
                  </button>
                  {manualDiscountActive && (
                    <button type="button" onClick={clearManualDiscount} className={btnSecondary}>
                      {t("clearDiscount")}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="bg-[var(--surface-muted)] rounded-xl p-4 space-y-3 text-sm">
            <div>
              <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                {t("servicesReview")}
              </p>
              <ul className="space-y-2">
                {(billPreview.lines && billPreview.lines.length > 0
                  ? billPreview.lines.map((line, idx) => {
                      const stylist =
                        cart[idx]?.staffId
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
                            {formatCurrency(linePrice)}
                          </span>
                        </li>
                      );
                    })
                  : cart.map((item, idx) => {
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
                            {formatCurrency(item.price)}
                          </span>
                        </li>
                      );
                    }))}
              </ul>
            </div>

            <div className="space-y-2 pt-1 border-t border-[var(--border)]">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">{tCommon("subtotal")}</span>
                <span>{formatCurrency(billPreview.subtotal)}</span>
              </div>
              {(billPreview.membershipDiscountAmount ?? 0) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>{billPreview.membershipLabel || t("membershipDiscount")}</span>
                  <span>-{formatCurrency(billPreview.membershipDiscountAmount ?? 0)}</span>
                </div>
              )}
              {(billPreview.promoDiscountAmount ?? 0) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>{billPreview.promoLabel || tCommon("discount")}</span>
                  <span>-{formatCurrency(billPreview.promoDiscountAmount ?? 0)}</span>
                </div>
              )}
              {(billPreview.manualDiscountAmount ?? 0) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>{billPreview.manualDiscountLabel || t("manualDiscount")}</span>
                  <span>-{formatCurrency(billPreview.manualDiscountAmount ?? 0)}</span>
                </div>
              )}
              <div className="flex justify-between items-center gap-3">
                <span className="text-[var(--text-secondary)] shrink-0">CGST</span>
                {billingLocked ? (
                  <span>{formatCurrency(Number(cgstInput) || 0)}</span>
                ) : (
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={cgstInput}
                    onChange={(e) => setCgstInput(e.target.value)}
                    aria-label="CGST"
                    className={`${inputClass} w-24 sm:w-28 max-w-[40%] text-right py-1.5 px-2`}
                  />
                )}
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="text-[var(--text-secondary)] shrink-0">SGST</span>
                {billingLocked ? (
                  <span>{formatCurrency(Number(sgstInput) || 0)}</span>
                ) : (
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={sgstInput}
                    onChange={(e) => setSgstInput(e.target.value)}
                    aria-label="SGST"
                    className={`${inputClass} w-24 sm:w-28 max-w-[40%] text-right py-1.5 px-2`}
                  />
                )}
              </div>
              {!billingLocked && !taxOverrideValid && (
                <p className="text-xs text-amber-700 dark:text-amber-400">{t("taxMustBePositive")}</p>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-[var(--border)]">
                <span>{tCommon("grandTotal")}</span>
                <span className="text-[var(--brand-text)]">{formatCurrency(displayGrandTotal)}</span>
              </div>
            </div>
          </div>

          {!billingLocked && (
            <>
              <button
                type="button"
                onClick={() => goToStep(2)}
                className={`${btnSecondary} w-full`}
              >
                {t("addMoreServices")}
              </button>
              <div>
                <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                  {t("paymentMode")}
                </p>
                <SegmentedControl
                  options={[
                    { id: "CASH", label: t("cash") },
                    { id: "UPI", label: t("upi") },
                    { id: "CARD", label: t("card") },
                  ]}
                  value={paymentMode}
                  onChange={(m) => setPaymentMode(m as "CASH" | "UPI" | "CARD")}
                />
              </div>
              {paymentMode !== "CASH" && (
                <input
                  placeholder={t("txnReference")}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className={inputClass}
                />
              )}
            </>
          )}

          {paymentSuccess && (
            <p className="text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl px-3 py-2">
              {paymentSuccess}
            </p>
          )}

          {billingLocked ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => void downloadPaidInvoice()}
                disabled={downloadingPdf}
                className={`${btnPrimary} w-full py-3.5`}
              >
                <Download className="w-4 h-4" />
                {downloadingPdf ? tCommon("processing") : t("downloadBill")}
              </button>
              <button
                type="button"
                onClick={() => router.push("/manager/bookings")}
                className={`${btnSecondary} w-full`}
              >
                {t("viewBookings")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setScreen("hub");
                  setPaidInvoiceId("");
                  setPaymentSuccess("");
                  setBookingId("");
                  router.replace("/manager/walk-in");
                  void refetchOpenVisits();
                }}
                className={`${btnSecondary} w-full`}
              >
                {t("done")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() =>
                payBooking.mutate({
                  id: bookingId,
                  amount: Number(displayGrandTotal.toFixed(2)),
                  cgstAmount: Number(parsedCgst.toFixed(2)),
                  sgstAmount: Number(parsedSgst.toFixed(2)),
                })
              }
              disabled={
                !taxOverrideValid ||
                payBooking.isPending ||
                applyPromo.isPending ||
                applyBillDiscount.isPending
              }
              className={`${btnPrimary} w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-600/20`}
            >
              {payBooking.isPending ? tCommon("processing") : t("completeInvoice")}
            </button>
          )}
        </Card>
      )}

      {step === 3 && !billPreview && (
        <Card className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">{tCommon("loading")}</p>
          <button type="button" onClick={() => setStep(2)} className={btnSecondary}>
            {t("addMoreServices")}
          </button>
        </Card>
      )}
    </div>
  );
}
