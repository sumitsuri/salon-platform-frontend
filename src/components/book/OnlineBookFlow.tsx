"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Home, MapPin, Plus, Sparkles } from "lucide-react";
import {
  bookApi,
  bookPath,
  type BookAppointment,
  type BookContext,
  type BookService,
  type BookSlot,
  type BookStaff,
} from "@/lib/book-api";
import { formatMoney } from "@/lib/utils";
import { PageLoader } from "@/components/ui";
import { OnlineBookAppBar, OnlineBookStepBar } from "@/components/book/OnlineBookAppBar";
import { OnlineBookServicePicker } from "@/components/book/OnlineBookServicePicker";

type Step = "service" | "stylist" | "time" | "confirm" | "done";

function formatSlotTime(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

function formatSlotDate(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

function nextDates(count: number) {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < count; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    out.push(x.toISOString().slice(0, 10));
  }
  return out;
}

function totalDurationMinutes(cart: BookService[]) {
  return cart.reduce((sum, s) => sum + (s.durationMinutes ?? 30), 0);
}

function totalPrice(cart: BookService[]) {
  return cart.reduce((sum, s) => sum + s.price, 0);
}

function BookBranchHero({ context, accent }: { context: BookContext; accent: string }) {
  return (
    <div className="relative overflow-hidden bg-white book-content-pad pb-4 pt-3 md:pb-6 md:pt-5">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-20 blur-2xl md:h-48 md:w-48"
        style={{ backgroundColor: accent }}
        aria-hidden
      />
      <div className="relative md:flex md:items-end md:justify-between md:gap-8">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8e8e93]">{context.tenantName}</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#1c1917] md:text-3xl lg:text-4xl">
            {context.branchName}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#636366] md:text-base">
            {context.openTime && context.closeTime ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4 shrink-0" aria-hidden />
                {context.openTime} – {context.closeTime}
              </span>
            ) : null}
            {context.address ? (
              <span className="inline-flex items-start gap-1.5 min-w-0 max-w-xl">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>{context.address}</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function OnlineBookFlow({ tenantSlug, branchCode }: { tenantSlug: string; branchCode: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [context, setContext] = useState<BookContext | null>(null);
  const [services, setServices] = useState<BookService[]>([]);
  const [staff, setStaff] = useState<BookStaff[]>([]);
  const [step, setStep] = useState<Step>("service");
  const [pickerKey, setPickerKey] = useState(0);
  const [cart, setCart] = useState<BookService[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | "any">("any");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<BookSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<BookSlot | null>(null);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<BookAppointment | null>(null);

  const dates = useMemo(() => nextDates(context?.maxAdvanceDays ?? 14), [context?.maxAdvanceDays]);
  const accent = context?.primaryColor || "#6366f1";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ctx, svc, st] = await Promise.all([
          bookApi.getContext(tenantSlug, branchCode),
          bookApi.listServices(tenantSlug, branchCode),
          bookApi.listStaff(tenantSlug, branchCode),
        ]);
        if (cancelled) return;
        if (!ctx.onlineBookingEnabled) {
          setError("Online booking is not enabled for this branch.");
          return;
        }
        setContext(ctx);
        setServices(svc);
        setStaff(st);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unable to load booking");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantSlug, branchCode]);

  function toggleService(itemId: string) {
    setCart((prev) => {
      const existing = prev.find((s) => s.branchServiceId === itemId);
      if (existing) return prev.filter((s) => s.branchServiceId !== itemId);
      const svc = services.find((s) => s.branchServiceId === itemId);
      return svc ? [...prev, svc] : prev;
    });
  }

  const loadSlots = useCallback(async () => {
    if (cart.length === 0) return;
    setSlotsLoading(true);
    setError("");
    try {
      const data = await bookApi.listSlots(
        tenantSlug,
        branchCode,
        selectedDate,
        cart.map((s) => s.branchServiceId),
        selectedStaffId === "any" ? undefined : selectedStaffId
      );
      setSlots(data);
      setSelectedSlot(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load time slots");
    } finally {
      setSlotsLoading(false);
    }
  }, [tenantSlug, branchCode, selectedDate, cart, selectedStaffId]);

  useEffect(() => {
    if (step === "time" && cart.length > 0) void loadSlots();
  }, [step, loadSlots, cart.length]);

  async function sendOtp() {
    setError("");
    try {
      const res = await bookApi.sendOtp(tenantSlug, branchCode, phone);
      setOtpSent(true);
      setDevOtp(res.devOtp ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send code");
    }
  }

  async function confirmBooking() {
    if (cart.length === 0 || !selectedSlot) return;
    setSubmitting(true);
    setError("");
    try {
      const appt = await bookApi.createAppointment(tenantSlug, branchCode, {
        phone,
        otp,
        customerName: name.trim() || "Guest",
        branchServiceIds: cart.map((s) => s.branchServiceId),
        staffId: selectedSlot.staffId,
        startAt: selectedSlot.startAt,
      });
      setConfirmation(appt);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setSubmitting(false);
    }
  }

  function startNewBooking() {
    setCart([]);
    setSelectedStaffId("any");
    setSelectedDate(new Date().toISOString().slice(0, 10));
    setSlots([]);
    setSelectedSlot(null);
    setPhone("");
    setOtp("");
    setOtpSent(false);
    setDevOtp(null);
    setName("");
    setConfirmation(null);
    setError("");
    setPickerKey((k) => k + 1);
    setStep("service");
  }

  function goBack() {
    if (step === "stylist") setStep("service");
    else if (step === "time") setStep("stylist");
    else if (step === "confirm") setStep("time");
  }

  if (loading) {
    return (
      <div className="book-app-shell flex min-h-dvh items-center justify-center">
        <PageLoader label="Loading…" />
      </div>
    );
  }

  if (error && !context) {
    return (
      <div className="book-app-shell p-4">
        <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  if (!context) return null;

  return (
    <div
      className="book-app-shell flex min-h-dvh flex-col"
      style={{ ["--book-accent" as string]: accent }}
    >
      <OnlineBookAppBar step={step} tenantSlug={tenantSlug} onBack={step !== "service" && step !== "done" ? goBack : undefined} />
      {step !== "done" ? <OnlineBookStepBar step={step} /> : null}

      {error && step !== "done" ? (
        <div className="book-content-pad mt-3">
          <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:items-stretch">
        {cart.length > 0 && step !== "done" && step !== "service" ? (
          <aside className="hidden border-b border-[#f2f2f7] bg-[#fafafa] lg:order-2 lg:block lg:w-80 lg:shrink-0 lg:border-b-0 lg:border-l xl:w-96">
            <div className="sticky top-[6.5rem] p-6">
              <CartSummary cart={cart} />
            </div>
          </aside>
        ) : null}

        {step === "service" && cart.length > 0 ? (
          <aside className="hidden border-b border-[#f2f2f7] bg-[#fafafa] lg:order-2 lg:block lg:w-80 lg:shrink-0 lg:border-b-0 lg:border-l xl:w-96">
            <div className="sticky top-[6.5rem] space-y-4 p-6">
              <CartSummary cart={cart} />
              <button
                type="button"
                className="book-cta w-full"
                style={{ backgroundColor: accent }}
                onClick={() => setStep("stylist")}
              >
                Continue · {formatMoney(totalPrice(cart))}
              </button>
              <p className="text-center text-xs text-[#8e8e93]">
                {cart.length} service{cart.length === 1 ? "" : "s"} · ~{totalDurationMinutes(cart)} min
              </p>
            </div>
          </aside>
        ) : null}

        <div className="min-w-0 flex-1 lg:order-1">
      {step === "service" ? (
        <>
          <BookBranchHero context={context} accent={accent} />
          <OnlineBookServicePicker
            key={pickerKey}
            services={services}
            branchId={context.branchId}
            cartIds={cart.map((s) => s.branchServiceId)}
            accent={accent}
            onToggle={toggleService}
          />
        </>
      ) : null}

      {step === "stylist" && cart.length > 0 ? (
        <div className="book-content-pad space-y-4 py-4 pb-8 lg:hidden">
          <CartSummary cart={cart} />
        </div>
      ) : null}
      {step === "stylist" && cart.length > 0 ? (
        <div className="book-content-pad space-y-4 py-4 pb-28 lg:pb-8">
          <p className="text-sm text-[#636366] md:text-base">Who would you like to see?</p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <StaffCard
              name="Any professional"
              subtitle="First available"
              selected={selectedStaffId === "any"}
              accent={accent}
              onSelect={() => setSelectedStaffId("any")}
            />
            {staff.map((s) => (
              <StaffCard
                key={s.id}
                name={s.name}
                subtitle={s.skills || "Stylist"}
                selected={selectedStaffId === s.id}
                accent={accent}
                onSelect={() => setSelectedStaffId(s.id)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {step === "time" && cart.length > 0 ? (
        <div className="book-content-pad space-y-4 py-4 pb-28 lg:pb-8">
          <div className="lg:hidden">
            <CartSummary cart={cart} compact />
          </div>
          <p className="text-sm text-[#636366] md:text-base">~{totalDurationMinutes(cart)} min total · pick a slot</p>
          <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
            {dates.map((d) => {
              const dt = new Date(d + "T12:00:00");
              const isSelected = selectedDate === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDate(d)}
                  className={`flex shrink-0 flex-col items-center rounded-2xl px-4 py-3 min-w-[4.5rem] touch-manipulation transition ${
                    isSelected ? "text-white shadow-md" : "bg-[#f2f2f7] text-[#1c1917]"
                  }`}
                  style={isSelected ? { backgroundColor: accent } : undefined}
                >
                  <span className="text-[11px] font-semibold uppercase opacity-90">
                    {new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(dt)}
                  </span>
                  <span className="text-xl font-bold tabular-nums">{dt.getDate()}</span>
                  <span className="text-[10px] opacity-80">
                    {new Intl.DateTimeFormat("en-IN", { month: "short" }).format(dt)}
                  </span>
                </button>
              );
            })}
          </div>
          {slotsLoading ? (
            <PageLoader label="Finding times…" />
          ) : slots.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#8e8e93]">No slots this day — try another date</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
              {slots.map((slot) => (
                <button
                  key={`${slot.startAt}-${slot.staffId}`}
                  type="button"
                  onClick={() => {
                    setSelectedSlot(slot);
                    setStep("confirm");
                  }}
                  className="rounded-xl bg-[#f2f2f7] py-3 text-sm font-semibold text-[#1c1917] hover:bg-[#e5e5ea] active:scale-[0.98] touch-manipulation"
                >
                  {formatSlotTime(slot.startAt)}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {step === "confirm" && cart.length > 0 && selectedSlot ? (
        <div className="book-content-pad py-4 pb-28 lg:pb-8">
          <div className="mx-auto max-w-3xl space-y-4 lg:grid lg:max-w-none lg:grid-cols-2 lg:gap-8 lg:space-y-0">
          <div className="rounded-2xl bg-[#f2f2f7] p-4 space-y-2 lg:p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-[#8e8e93]">Your appointment</p>
            <p className="text-lg font-bold text-[#1c1917]">
              {formatSlotDate(selectedSlot.startAt)} at {formatSlotTime(selectedSlot.startAt)}
            </p>
            <p className="text-sm text-[#636366]">{selectedSlot.staffName}</p>
            <ul className="mt-2 space-y-1 border-t border-[#e5e5ea] pt-2">
              {cart.map((s) => (
                <li key={s.branchServiceId} className="flex justify-between gap-2 text-sm">
                  <span className="text-[#1c1917]">{s.name}</span>
                  <span className="font-semibold tabular-nums">{formatMoney(s.price)}</span>
                </li>
              ))}
            </ul>
            <p className="flex justify-between border-t border-[#e5e5ea] pt-2 text-base font-bold">
              <span>Total</span>
              <span className="tabular-nums">{formatMoney(totalPrice(cart))}</span>
            </p>
          </div>
          <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#636366]">Full name</span>
            <input
              className="book-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="As on your phone"
              autoComplete="name"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#636366]">Mobile number</span>
            <input
              className="book-input"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile"
              autoComplete="tel"
            />
          </label>
          {!otpSent ? (
            <button
              type="button"
              className="book-cta"
              style={{ backgroundColor: accent }}
              disabled={phone.replace(/\D/g, "").length < 10}
              onClick={() => void sendOtp()}
            >
              Send verification code
            </button>
          ) : (
            <>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-[#636366]">Verification code</span>
                <input
                  className="book-input text-center text-lg tracking-[0.3em]"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="• • • • • •"
                />
              </label>
              {devOtp ? <p className="text-center text-xs text-amber-700">Dev code: {devOtp}</p> : null}
              <button
                type="button"
                className="book-cta"
                style={{ backgroundColor: accent }}
                disabled={submitting || otp.length < 4}
                onClick={() => void confirmBooking()}
              >
                {submitting ? "Confirming…" : "Confirm booking"}
              </button>
            </>
          )}
          </div>
          </div>
        </div>
      ) : null}

      {step === "done" && confirmation ? (
        <div className="book-content-pad space-y-5 py-6 pb-10 md:py-10">
          <div className="mx-auto max-w-lg space-y-5 md:max-w-xl">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 md:h-20 md:w-20">
                <CheckCircle2 className="h-9 w-9 text-emerald-600 md:h-10 md:w-10" aria-hidden />
              </div>
              <h2 className="mt-4 text-2xl font-bold text-[#1c1917] md:text-3xl">You&apos;re booked!</h2>
              <p className="mt-1 text-sm text-[#636366]">
                Code <span className="font-bold text-[#1c1917]">{confirmation.confirmationCode}</span>
              </p>
            </div>
            <dl className="space-y-3 rounded-2xl bg-[#f2f2f7] p-4 text-sm md:p-6">
              <Row label="When" value={`${formatSlotDate(confirmation.scheduledStartAt)} · ${formatSlotTime(confirmation.scheduledStartAt)}`} />
              <Row label="Professional" value={confirmation.staffName} />
              <Row label="Services" value={(confirmation.serviceNames ?? [confirmation.serviceName]).join(", ")} />
              <Row label="Location" value={confirmation.branchName} />
            </dl>
            <p className="text-center text-xs text-[#8e8e93]">Details will be sent on WhatsApp when available.</p>
            <div className="space-y-2 sm:flex sm:gap-3 sm:space-y-0">
              <button type="button" className="book-cta flex-1" style={{ backgroundColor: accent }} onClick={startNewBooking}>
                <Plus className="mr-2 inline h-4 w-4" aria-hidden />
                Book another visit
              </button>
              <Link href={bookPath(tenantSlug)} className="book-cta-secondary flex-1">
                <Home className="mr-2 inline h-4 w-4" aria-hidden />
                Browse all branches
              </Link>
            </div>
          </div>
        </div>
      ) : null}

        </div>
      </div>

      {step === "stylist" && cart.length > 0 ? (
        <BottomCta accent={accent} label="Continue" onClick={() => setStep("time")} />
      ) : null}

      {step === "service" && cart.length > 0 ? (
        <BottomCta
          accent={accent}
          className="lg:hidden"
          label={`Continue · ${formatMoney(totalPrice(cart))}`}
          sub={`${cart.length} service${cart.length === 1 ? "" : "s"} · ~${totalDurationMinutes(cart)} min`}
          onClick={() => setStep("stylist")}
        />
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-[#8e8e93]">{label}</dt>
      <dd className="text-right font-medium text-[#1c1917]">{value}</dd>
    </div>
  );
}

function CartSummary({ cart, compact }: { cart: BookService[]; compact?: boolean }) {
  return (
    <div className="rounded-2xl border border-[#f2f2f7] bg-white p-3 shadow-sm">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#8e8e93]">
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        Selected
      </p>
      <ul className={`space-y-1 ${compact ? "text-sm" : ""}`}>
        {cart.map((s) => (
          <li key={s.branchServiceId} className="flex justify-between gap-2">
            <span className="text-[#1c1917]">{s.name}</span>
            <span className="shrink-0 font-semibold tabular-nums">{formatMoney(s.price)}</span>
          </li>
        ))}
      </ul>
      {!compact ? (
        <p className="mt-2 border-t border-[#f2f2f7] pt-2 text-sm font-bold text-[#1c1917]">
          {formatMoney(totalPrice(cart))} · ~{totalDurationMinutes(cart)} min
        </p>
      ) : null}
    </div>
  );
}

function StaffCard({
  name,
  subtitle,
  selected,
  accent,
  onSelect,
}: {
  name: string;
  subtitle: string;
  selected: boolean;
  accent: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left touch-manipulation transition ${
        selected ? "border-transparent bg-[#f2f2f7]" : "border-[#f2f2f7] bg-white"
      }`}
      style={selected ? { borderColor: accent, backgroundColor: `${accent}12` } : undefined}
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
        style={{ backgroundColor: selected ? accent : "#c7c7cc" }}
      >
        {name.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[#1c1917]">{name}</p>
        <p className="text-sm text-[#8e8e93] truncate">{subtitle}</p>
      </div>
      <div
        className={`h-5 w-5 shrink-0 rounded-full border-2 ${selected ? "border-transparent" : "border-[#d1d1d6]"}`}
        style={selected ? { backgroundColor: accent, borderColor: accent } : undefined}
      />
    </button>
  );
}

function BottomCta({
  accent,
  label,
  sub,
  onClick,
  className = "",
}: {
  accent: string;
  label: string;
  sub?: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <div className={`book-flow-cta ${className}`.trim()}>
      {sub ? <p className="mb-2 text-center text-xs text-[#8e8e93]">{sub}</p> : null}
      <button type="button" className="book-cta mx-auto w-full max-w-xl lg:max-w-none" style={{ backgroundColor: accent }} onClick={onClick}>
        {label}
      </button>
    </div>
  );
}
