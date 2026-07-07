"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Trash2, Plus } from "lucide-react";
import { api, BillPreview, BranchServiceItem, StaffItem } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { formatCurrency } from "@/lib/utils";

type Step = 1 | 2 | 3;

interface CartItem {
  branchServiceId: string;
  serviceName: string;
  price: number;
  staffId: string;
}

export default function WalkInPage() {
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branchId || "";
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [phone, setPhone] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [society, setSociety] = useState(user?.branchName?.includes("Lithos") ? "Mantri Lithos" : "Mantri Webcity");
  const [flat, setFlat] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "CARD">("CASH");
  const [reference, setReference] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [billPreview, setBillPreview] = useState<BillPreview | null>(null);
  const [error, setError] = useState("");

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

  const payBooking = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      api.payBooking(id, { mode: paymentMode, amount, reference }),
    onSuccess: () => router.push("/manager"),
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
      setError(e instanceof Error ? e.message : "Failed");
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
      setError("Assign stylist to every service");
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

  const steps = ["Customer", "Services", "Payment"];

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              step > i + 1 ? "bg-green-500 text-white" : step === i + 1 ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"
            }`}>{i + 1}</div>
            <span className={`text-sm hidden sm:block ${step === i + 1 ? "font-semibold text-slate-900" : "text-slate-400"}`}>{label}</span>
            {i < steps.length - 1 && <div className={`flex-1 h-0.5 ${step > i + 1 ? "bg-green-400" : "bg-slate-200"}`} />}
          </div>
        ))}
      </div>

      <h1 className="text-xl font-bold text-slate-900">New Walk-in</h1>

      {error && (
        <div className="text-red-700 text-sm bg-red-50 border border-red-200 p-3 rounded-lg">{error}</div>
      )}

      {step === 1 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 max-w-lg">
          <div className="flex gap-2">
            <input placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            <button onClick={searchCustomer}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium text-sm transition">
              Search
            </button>
          </div>
          <input placeholder="Customer name *" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          <input placeholder="Society" value={society} onChange={(e) => setSociety(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          <input placeholder="Flat / Unit" value={flat} onChange={(e) => setFlat(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          <button onClick={registerAndContinue} disabled={!phone || !customerName}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold disabled:opacity-50 transition">
            Continue to Services →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="grid lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Add Services</p>
            <div className="grid sm:grid-cols-2 gap-2 max-h-[420px] overflow-y-auto">
              {services.map((s) => (
                <button key={s.id} onClick={() => addService(s)}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50 transition text-left group">
                  <div>
                    <p className="font-medium text-sm text-slate-800">{s.serviceName}</p>
                    <p className="text-xs text-slate-400">{s.categoryName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-indigo-700">{formatCurrency(s.price)}</span>
                    <Plus className="w-4 h-4 text-indigo-400 opacity-0 group-hover:opacity-100" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Cart ({cart.length})
            </p>
            <div className="flex-1 space-y-2 overflow-y-auto max-h-72">
              {cart.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-8">Tap a service to add</p>
              )}
              {cart.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex justify-between items-start">
                    <p className="font-medium text-sm">{item.serviceName}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-indigo-700">{formatCurrency(item.price)}</span>
                      <button onClick={() => removeFromCart(idx)} className="text-slate-400 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <select value={item.staffId} onChange={(e) => updateStaff(idx, e.target.value)}
                    className="mt-2 w-full p-2 border border-slate-200 rounded-lg text-sm bg-white">
                    <option value="">Select stylist *</option>
                    {staff.map((st: StaffItem) => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex justify-between text-sm text-slate-500 mb-1">
                <span>Est. total (incl. GST)</span>
                <span className="font-bold text-lg text-slate-900">{formatCurrency(estimateGrandTotal)}</span>
              </div>
              <button onClick={submitBooking} disabled={cart.length === 0 || createBooking.isPending}
                className="w-full mt-3 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold disabled:opacity-50 transition">
                {createBooking.isPending ? "Processing..." : "Continue to Bill →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && billPreview && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-lg space-y-5">
          <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatCurrency(billPreview.subtotal)}</span></div>
            {billPreview.discountAmount > 0 && (
              <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(billPreview.discountAmount)}</span></div>
            )}
            <div className="flex justify-between"><span className="text-slate-500">CGST</span><span>{formatCurrency(billPreview.cgstAmount)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">SGST</span><span>{formatCurrency(billPreview.sgstAmount)}</span></div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-slate-200">
              <span>Grand Total</span><span className="text-indigo-700">{formatCurrency(billPreview.grandTotal)}</span>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Payment Mode</p>
            <div className="flex gap-2">
              {(["CASH", "UPI", "CARD"] as const).map((m) => (
                <button key={m} onClick={() => setPaymentMode(m)}
                  className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition ${
                    paymentMode === m ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 hover:border-indigo-300"
                  }`}>{m}</button>
              ))}
            </div>
          </div>

          {paymentMode !== "CASH" && (
            <input placeholder="Transaction reference" value={reference} onChange={(e) => setReference(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          )}

          <button
            onClick={() => payBooking.mutate({ id: bookingId, amount: Number(billPreview.grandTotal) })}
            disabled={payBooking.isPending}
            className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-base disabled:opacity-50 transition">
            {payBooking.isPending ? "Processing..." : "Generate Invoice & Complete"}
          </button>
        </div>
      )}
    </div>
  );
}
