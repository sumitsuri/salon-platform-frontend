"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Trash2, Plus } from "lucide-react";
import { api, BillPreview, BranchServiceItem, StaffItem } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { formatCurrency, cn } from "@/lib/utils";
import {
  PageHeader,
  Card,
  AlertBanner,
  SegmentedControl,
  inputClass,
  selectClass,
  btnPrimary,
  btnSecondary,
} from "@/components/ui";
import { WizardSteps } from "@/components/enterprise-ui";
import { MissionStrip } from "@/components/brand/MissionStrip";

type Step = 1 | 2 | 3;

interface CartItem {
  branchServiceId: string;
  serviceName: string;
  price: number;
  staffId: string;
}

export default function WalkInPage() {
  const t = useTranslations("manager.walkIn");
  const tCommon = useTranslations("common");
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branchId || "";
  const router = useRouter();
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
  const [billPreview, setBillPreview] = useState<BillPreview | null>(null);
  const [error, setError] = useState("");

  const steps = [t("stepCustomer"), t("stepServices"), t("stepPayment")];

  const { data: services = [] } = useQuery({
    queryKey: ["services", branchId],
    queryFn: () => api.getBranchServices(branchId),
    enabled: !!branchId,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff", branchId],
    queryFn: () => api.getStaff(branchId),
    enabled: !!branchId,
  });

  const createBooking = useMutation({
    mutationFn: (data: Parameters<typeof api.createBooking>[0]) => api.createBooking(data),
    onSuccess: (b) => {
      setBookingId(b.id);
      setBillPreview(b.billPreview ?? null);
      setStep(3);
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  const [paymentSuccess, setPaymentSuccess] = useState("");

  const payBooking = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      api.payBooking(id, { mode: paymentMode, amount, reference }),
    onSuccess: (booking) => {
      if (booking.receiptQueued) {
        setPaymentSuccess(t("receiptQueued", { phone: booking.customerPhone }));
        setTimeout(() => router.push("/manager"), 2500);
      } else {
        router.push("/manager");
      }
    },
    onError: (e: Error) => setError(e.message),
  });

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
    setCart([...cart, { branchServiceId: s.id, serviceName: s.serviceName, price: s.price, staffId: "" }]);
  }

  function removeFromCart(idx: number) {
    setCart(cart.filter((_, i) => i !== idx));
  }

  function updateStaff(idx: number, staffId: string) {
    const next = [...cart];
    next[idx].staffId = staffId;
    setCart(next);
  }

  function submitBooking() {
    if (cart.some((c) => !c.staffId)) {
      setError(t("assignStylistError"));
      return;
    }
    setError("");
    createBooking.mutate({
      branchId,
      customerId,
      lines: cart.map((c) => ({ branchServiceId: c.branchServiceId, staffId: c.staffId, quantity: 1 })),
    });
  }

  const estimateSubtotal = cart.reduce((s, c) => s + c.price, 0);
  const estimateGrandTotal = estimateSubtotal * 1.18;

  return (
    <div className="space-y-4">
      <PageHeader title={t("title")} subtitle={user?.branchName} />

      <WizardSteps steps={steps} current={step} />

      <MissionStrip />

      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      {step === 1 && (
        <Card className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <input placeholder={t("phonePlaceholder")} value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
            <button onClick={searchCustomer} className={`${btnSecondary} shrink-0 sm:px-5`}>
              {tCommon("search")}
            </button>
          </div>
          <input placeholder={t("namePlaceholder")} value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputClass} />
          <input placeholder={t("societyPlaceholder")} value={society} onChange={(e) => setSociety(e.target.value)} className={inputClass} />
          <input placeholder={t("flatPlaceholder")} value={flat} onChange={(e) => setFlat(e.target.value)} className={inputClass} />
          <button onClick={registerAndContinue} disabled={!phone || !customerName} className={`${btnPrimary} w-full`}>
            {t("continueServices")}
          </button>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Card padding={false}>
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">{t("addServices")}</p>
            </div>
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[45vh] overflow-y-auto">
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => addService(s)}
                  className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] hover:border-[var(--brand)] hover:bg-[var(--brand-light)] transition text-left active:scale-[0.98] group"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-[var(--text-primary)] truncate">{s.serviceName}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{s.categoryName}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="font-bold text-sm text-[var(--brand-text)]">{formatCurrency(s.price)}</span>
                    <Plus className="w-4 h-4 text-[var(--brand-text)]" />
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="sticky bottom-20 lg:bottom-4 z-10 shadow-lg">
            <div className="flex items-center justify-between mb-3">
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
                        <span className="text-sm font-semibold text-[var(--brand-text)]">{formatCurrency(item.price)}</span>
                        <button onClick={() => removeFromCart(idx)} className="text-[var(--text-tertiary)] hover:text-red-500 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <select value={item.staffId} onChange={(e) => updateStaff(idx, e.target.value)} className={`${selectClass} mt-2 py-2`}>
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
            <button onClick={submitBooking} disabled={cart.length === 0 || createBooking.isPending} className={`${btnPrimary} w-full mt-4`}>
              {createBooking.isPending ? tCommon("processing") : t("continueBill")}
            </button>
          </Card>
        </div>
      )}

      {step === 3 && billPreview && (
        <Card className="space-y-5">
          <div className="bg-[var(--surface-muted)] rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">{tCommon("subtotal")}</span>
              <span>{formatCurrency(billPreview.subtotal)}</span>
            </div>
            {billPreview.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>{tCommon("discount")}</span>
                <span>-{formatCurrency(billPreview.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">CGST</span>
              <span>{formatCurrency(billPreview.cgstAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">SGST</span>
              <span>{formatCurrency(billPreview.sgstAmount)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-[var(--border)]">
              <span>{tCommon("grandTotal")}</span>
              <span className="text-[var(--brand-text)]">{formatCurrency(billPreview.grandTotal)}</span>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">{t("paymentMode")}</p>
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
            <input placeholder={t("txnReference")} value={reference} onChange={(e) => setReference(e.target.value)} className={inputClass} />
          )}

          {paymentSuccess && (
            <p className="text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl px-3 py-2">{paymentSuccess}</p>
          )}

          <button
            onClick={() => payBooking.mutate({ id: bookingId, amount: Number(billPreview.grandTotal) })}
            disabled={payBooking.isPending}
            className={`${btnPrimary} w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-600/20`}
          >
            {payBooking.isPending ? tCommon("processing") : t("completeInvoice")}
          </button>
        </Card>
      )}
    </div>
  );
}
