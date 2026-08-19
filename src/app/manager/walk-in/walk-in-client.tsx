"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  CreditCard,
  ChevronRight,
  UserPlus,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Pencil,
  ShoppingBag,
  X,
  CheckCircle2,
  Scissors,
  Sparkles,
  Tag,
} from "lucide-react";
import {
  api,
  BillPreview,
  Booking,
  BranchServiceItem,
  CustomerRegistrationCard,
  MembershipSubscription,
} from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import {
  digitsOnly,
  isValidIndianMobile,
  normalizeIndianMobile,
  optionalPhoneBlocksContinue,
  shouldShowInvalidPhoneHint,
} from "@/lib/phone";
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
import { buildWalkInUrl, customerDetailPath } from "@/lib/navigation-scope";
import { matchCustomerByExactName } from "@/lib/walk-in-customer-match";
import {
  bumpLookupGeneration,
  emptyAutoFilledFields,
  isLookupGenerationStale,
  resolveLookupField,
  type AutoFilledLookupFields,
  type CustomerLookupField,
} from "@/lib/customer-lookup-session";
import { formatCurrency, formatMoney, cn } from "@/lib/utils";
import {
  PageHeader,
  Card,
  AlertBanner,
  Callout,
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
import { WalkInPaymentSuccess } from "./WalkInPaymentSuccess";
import { InvoicePdfButtons } from "@/components/billing/InvoicePdfButtons";
import { WalkInCompactSteps } from "./WalkInCompactSteps";
import { WalkInVisitPassBanner } from "./WalkInVisitPassBanner";
import { WalkInMembershipPicker } from "./WalkInMembershipPicker";
import { WalkInMembershipSavingsBanner } from "./WalkInMembershipSavingsBanner";
import { WalkInServiceCatalog } from "./WalkInServiceCatalog";
import { WalkInCatalogTrail, type WalkInCatalogTrailSegment } from "./WalkInCatalogTrail";
import { WalkInMobileCartActions } from "./WalkInMobileCartActions";
import { WalkInMobilePaymentActions } from "./WalkInMobilePaymentActions";
import { WalkInCartPanel } from "./WalkInCartPanel";
import { WalkInServicePriceSheet } from "./WalkInServicePriceSheet";
import { WalkInDiscountSheet } from "./WalkInDiscountSheet";
import { WalkInAppliedAdjustmentsBanner } from "./WalkInAppliedAdjustmentsBanner";
import { WalkInEditablePriceButton } from "./WalkInEditablePriceButton";
import { RegistrationCardPanel } from "@/components/customer/RegistrationCardPanel";
import { BillBreakdownRows, membershipFeeServiceLine } from "@/components/billing/BillBreakdownRows";
import { WalkInCartItem, walkInCartLinePrice } from "./walk-in-types";
import {
  buildWalkInSubCategories,
  filterWalkInServices,
  groupWalkInSubCategories,
  shouldAutoSelectSubCategory,
} from "./walk-in-catalog";
import { repairOrphanedScrollLock } from "@/lib/scroll-lock";

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
const VISIT_PASS_RE = /^[A-Z0-9]{2,4}-([A-Z0-9]{2,10}-)?\d{6}$/;

type ExistingLookupStatus = "idle" | "loading" | "found" | "not_found";

function normalizeVisitPassInput(raw: string) {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

function isValidVisitPassFormat(raw: string) {
  return VISIT_PASS_RE.test(normalizeVisitPassInput(raw));
}

export default function WalkInPage() {
  const t = useTranslations("manager.walkIn");
  const tCustomers = useTranslations("customers");
  const tCommon = useTranslations("common");
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branchId || "";
  const router = useRouter();
  const searchParams = useSearchParams();
  const preferredStaffId = searchParams.get("staffId") || "";
  const wantNewVisit = searchParams.get("new") === "1";
  const hubTabParam = searchParams.get("tab") === "history" ? "history" : "open";
  const urlCustomerId = searchParams.get("customerId") || undefined;
  const queryClient = useQueryClient();
  const localeKit = getTenantLocaleKit();

  const [screen, setScreen] = useState<Screen>("hub");
  const [hubTab, setHubTab] = useState<HubTab>(hubTabParam);
  const [step, setStep] = useState<Step>(1);
  const [phone, setPhone] = useState("");
  const [visitPassInput, setVisitPassInput] = useState("");
  const [visitPassId, setVisitPassId] = useState("");
  const [customerLookupMode, setCustomerLookupMode] = useState<"new" | "existing">("existing");
  const [newGuestFromExisting, setNewGuestFromExisting] = useState(false);
  const [registrationCard, setRegistrationCard] = useState<CustomerRegistrationCard | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [society, setSociety] = useState(user?.branchName ?? "");
  const [flat, setFlat] = useState("");
  const [lookupState, setLookupState] = useState<"idle" | "loading" | "done">("idle");
  const [existingLookupStatus, setExistingLookupStatus] = useState<ExistingLookupStatus>("idle");
  const existingLookupRef = useRef<string>("");
  const existingLookupGenerationRef = useRef(0);
  const existingSearchFieldRef = useRef<CustomerLookupField | null>(null);
  const existingAutoFilledRef = useRef<AutoFilledLookupFields>(emptyAutoFilledFields());
  const newPhoneLookupGenerationRef = useRef(0);
  const newPhoneAutoFilledRef = useRef({ name: false, visitPass: false });
  const existingAutoAdvanceKeyRef = useRef("");
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
  const [catalogSub, setCatalogSub] = useState("");
  const [serviceQuery, setServiceQuery] = useState("");
  const [recentServiceIds, setRecentServiceIds] = useState<string[]>([]);
  const [favoriteServiceIds, setFavoriteServiceIds] = useState<string[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<RecentCustomer[]>([]);
  const [draftOffer, setDraftOffer] = useState<WalkInDraft | null>(null);
  const [draftHandled, setDraftHandled] = useState(false);
  const [draftRestoredNotice, setDraftRestoredNotice] = useState(false);
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [priceEditIdx, setPriceEditIdx] = useState<number | null>(null);
  const [discountSheetOpen, setDiscountSheetOpen] = useState(false);
  const [discountApplySuccess, setDiscountApplySuccess] = useState(false);
  const [savingPrice, setSavingPrice] = useState(false);
  const discountSheetOpenRef = useRef(false);
  const [addedToast, setAddedToast] = useState<string | null>(null);
  const [removedToast, setRemovedToast] = useState<string | null>(null);
  const [pendingMembershipPlanId, setPendingMembershipPlanId] = useState("");

  useEffect(() => {
    discountSheetOpenRef.current = discountSheetOpen;
    if (!discountSheetOpen) setDiscountApplySuccess(false);
  }, [discountSheetOpen]);

  function closeDiscountSheet() {
    setDiscountSheetOpen(false);
    setDiscountApplySuccess(false);
  }

  function showDiscountAppliedSuccess(preview: BillPreview | null | undefined) {
    if (!discountSheetOpenRef.current) return;
    setDiscountApplySuccess(true);
    void preview;
  }

  const lookupPhoneRef = useRef<string>("");
  const lastAppliedManualRef = useRef<{ type: DiscountKind; value: string } | null>(null);
  const savedCustomerNameRef = useRef<string>("");
  const steps = [t("stepCustomer"), t("stepServices"), t("stepPayment")];
  const billingLocked = !!paidInvoiceId;

  useEffect(() => {
    if (!addedToast) return;
    const id = setTimeout(() => setAddedToast(null), 2200);
    return () => clearTimeout(id);
  }, [addedToast]);

  useEffect(() => {
    if (!removedToast) return;
    const id = setTimeout(() => setRemovedToast(null), 2200);
    return () => clearTimeout(id);
  }, [removedToast]);

  useEffect(() => {
    if (step !== 2) setCartSheetOpen(false);
  }, [step]);

  useEffect(() => {
    if (step !== 2) return;
    repairOrphanedScrollLock();
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
    const preferred = ["Men", "Women", "Kids", "Shared", "Spa"];
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => {
        const ai = preferred.indexOf(a.name);
        const bi = preferred.indexOf(b.name);
        if (ai >= 0 || bi >= 0) return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
        return a.name.localeCompare(b.name);
      });
  }, [services]);

  const subCategories = useMemo(
    () => buildWalkInSubCategories(services, catalogTop),
    [services, catalogTop]
  );

  const subCategoryGroups = useMemo(() => {
    if (catalogTop) {
      const parentName = topCategories.find((t) => t.id === catalogTop)?.name ?? "";
      return [{ parentId: catalogTop, parentName, items: subCategories }];
    }
    return groupWalkInSubCategories(subCategories);
  }, [catalogTop, subCategories, topCategories]);

  const filteredServices = useMemo(
    () => filterWalkInServices(services, catalogTop, catalogSub, serviceQuery),
    [services, catalogTop, catalogSub, serviceQuery]
  );

  function handleCatalogTopChange(id: string) {
    setCatalogTop(id);
    const subs = buildWalkInSubCategories(services, id);
    const auto = shouldAutoSelectSubCategory(subs, id);
    setCatalogSub(auto ?? "");
  }

  function resetCatalogBrowse() {
    setServiceQuery("");
    setCatalogTop("");
    setCatalogSub("");
  }

  function catalogCanGoBack() {
    return Boolean(serviceQuery.trim() || catalogSub || catalogTop);
  }

  function goBackInCatalog() {
    setCartSheetOpen(false);
    if (serviceQuery.trim()) {
      setServiceQuery("");
      return;
    }
    if (catalogSub) {
      setCatalogSub("");
      return;
    }
    if (catalogTop) {
      setCatalogTop("");
      setCatalogSub("");
    }
  }

  function navigateCatalogTo(top: string, sub: string) {
    setCartSheetOpen(false);
    setServiceQuery("");
    if (!top && !sub) {
      resetCatalogBrowse();
      return;
    }
    if (sub) {
      setCatalogTop(top);
      setCatalogSub(sub);
      return;
    }
    handleCatalogTopChange(top);
  }

  const activeCatalogTop = useMemo(
    () => topCategories.find((category) => category.id === catalogTop),
    [topCategories, catalogTop]
  );
  const activeCatalogSub = useMemo(
    () => subCategories.find((sub) => sub.id === catalogSub),
    [subCategories, catalogSub]
  );

  const catalogTrailSegments = useMemo((): WalkInCatalogTrailSegment[] => {
    const query = serviceQuery.trim();
    if (query) {
      const shortQuery = query.length > 14 ? `${query.slice(0, 14)}…` : query;
      return [
        {
          id: "all",
          label: t("allCategories"),
          onSelect: resetCatalogBrowse,
        },
        {
          id: "search",
          label: `${t("searchTrail")}: ${shortQuery}`,
          active: true,
        },
      ];
    }

    const segments: WalkInCatalogTrailSegment[] = [
      {
        id: "all",
        label: t("allCategories"),
        active: !catalogTop && !catalogSub,
        onSelect: catalogTop || catalogSub ? () => navigateCatalogTo("", "") : undefined,
      },
    ];

    if (catalogTop && activeCatalogTop) {
      segments.push({
        id: `top-${catalogTop}`,
        label: activeCatalogTop.name,
        active: !catalogSub,
        onSelect: catalogSub ? () => setCatalogSub("") : undefined,
      });
    }

    if (catalogSub && activeCatalogSub) {
      segments.push({
        id: `sub-${catalogSub}`,
        label: activeCatalogSub.name,
        active: true,
      });
    }

    return segments;
  }, [
    activeCatalogSub,
    activeCatalogTop,
    catalogSub,
    catalogTop,
    serviceQuery,
    t,
  ]);

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
    enabled: !!branchId && screen === "flow",
  });

  const phoneNumberRequired = branch?.phoneNumberRequired !== false;
  const gstEffective = branch?.gstEffective === true;

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

  // Sync editable CGST/SGST from server bill preview when GST is enabled for this branch.
  useEffect(() => {
    if (!billPreview || billingLocked || bookingStatus === "COMPLETED") return;
    if (taxOverridden) return;
    if (!gstEffective) {
      setCgstInput("0");
      setSgstInput("0");
      return;
    }
    setCgstInput(String(billPreview.cgstAmount ?? 0));
    setSgstInput(String(billPreview.sgstAmount ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when bill amounts change, not on every preview field
  }, [
    billPreview?.taxableAmount,
    billPreview?.subtotal,
    billPreview?.cgstAmount,
    billPreview?.sgstAmount,
    billPreview?.grandTotal,
    billingLocked,
    bookingStatus,
    taxOverridden,
    gstEffective,
  ]);

  const hydrateFromBooking = useCallback((b: Booking) => {
    setBookingId(b.id);
    setBookingStatus(b.status);
    setCustomerId(b.customerId);
    setCustomerName(b.customerName);
    savedCustomerNameRef.current = b.customerName?.trim() ?? "";
    setPhone(b.customerPhone || "");
    setSelectedCouponId(b.couponId || "");
    setSelectedOfferId(b.offerId || "");
    if (b.billDiscountType) {
      setBillDiscountType(b.billDiscountType);
      setBillDiscountValue(String(b.billDiscountValue ?? ""));
      lastAppliedManualRef.current = {
        type: b.billDiscountType,
        value: String(b.billDiscountValue ?? ""),
      };
    } else {
      setBillDiscountType("");
      setBillDiscountValue("");
      lastAppliedManualRef.current = null;
    }
    setBillPreview(b.billPreview ?? null);
    if (b.billPreview) {
      setCgstInput(String(b.billPreview.cgstAmount ?? 0));
      setSgstInput(String(b.billPreview.sgstAmount ?? 0));
    } else {
      setCgstInput("0");
      setSgstInput("0");
    }
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
    setRegistrationCard(null);
    if (b.customerId) {
      void api.getCustomer(b.customerId).then((c) => {
        setVisitPassId(c.visitPassId || "");
        setVisitPassInput(c.visitPassId || "");
      }).catch(() => undefined);
    }
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

  function returnFromFlow() {
    setScreen("hub");
    router.replace(urlCustomerId ? customerDetailPath("manager", urlCustomerId) : buildWalkInUrl());
    void refetchOpenVisits();
  }

  function hasFlowProgress() {
    return (
      cart.length > 0 ||
      Boolean(customerName.trim() || phone.trim() || visitPassInput.trim() || customerId || bookingId)
    );
  }

  function confirmLeaveFlow() {
    if (!hasFlowProgress()) return true;
    return window.confirm(t("leaveFlowConfirm"));
  }

  async function goBackInFlow() {
    if (billingLocked) return;
    if (step === 3) {
      await goToStep(2);
      return;
    }
    if (step === 2) {
      if (catalogCanGoBack()) goBackInCatalog();
      return;
    }
    if (!confirmLeaveFlow()) return;
    returnFromFlow();
  }

  function setVisitsTab(next: HubTab) {
    setHubTab(next);
    router.replace(
      buildWalkInUrl({
        tab: next === "history" ? "history" : undefined,
        customerId: urlCustomerId,
      })
    );
  }

  useEffect(() => {
    if (screen !== "flow" || !customerId || !branchId) return;
    let cancelled = false;
    void api
      .getCustomerRegistrationCard(customerId, branchId)
      .then((card) => {
        if (!cancelled) {
          setRegistrationCard(card);
          if (card.visitPassId) {
            setVisitPassId(card.visitPassId);
            setVisitPassInput(card.visitPassId);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setRegistrationCard(null);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId, branchId, screen]);

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
    setVisitPassInput(draftOffer.visitPassId || "");
    setVisitPassId(draftOffer.visitPassId || "");
    if (draftOffer.customerId) {
      setCustomerLookupMode("existing");
      setNewGuestFromExisting(false);
    } else if (draftOffer.phone || draftOffer.visitPassId) {
      setCustomerLookupMode("new");
      setNewGuestFromExisting(true);
    } else {
      setCustomerLookupMode("existing");
      setNewGuestFromExisting(false);
    }
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
    if (!phone && !visitPassInput && !customerName && cart.length === 0) return;
    const handle = setTimeout(() => {
      saveWalkInDraft(branchId, {
        phone,
        visitPassId: visitPassInput,
        customerName,
        customerId,
        society,
        flat,
        cart,
        step,
      });
    }, DRAFT_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [screen, bookingId, branchId, phone, visitPassInput, customerName, customerId, society, flat, cart, step]);

  const startNewVisit = useCallback(() => {
    clearWalkInDraft(branchId);
    setBookingId("");
    setBookingStatus("");
    setPhone("");
    setVisitPassInput("");
    setVisitPassId("");
    setCustomerLookupMode("existing");
    setNewGuestFromExisting(false);
    setRegistrationCard(null);
    setCustomerId("");
    setCustomerName("");
    setSociety(user?.branchName ?? "");
    setFlat("");
    setLookupState("idle");
    setExistingLookupStatus("idle");
    existingLookupRef.current = "";
    existingLookupGenerationRef.current = 0;
    existingSearchFieldRef.current = null;
    existingAutoFilledRef.current = emptyAutoFilledFields();
    existingAutoAdvanceKeyRef.current = "";
    newPhoneLookupGenerationRef.current = 0;
    newPhoneAutoFilledRef.current = { name: false, visitPass: false };
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
    setCatalogSub("");
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
        lastAppliedManualRef.current = {
          type: b.billDiscountType,
          value: String(b.billDiscountValue ?? ""),
        };
      } else {
        setBillDiscountType("");
        setBillDiscountValue("");
        lastAppliedManualRef.current = null;
      }
      setError("");
      const promoApplied = (b.billPreview?.promoDiscountAmount ?? 0) > 0;
      if (promoApplied && (b.couponId || b.offerId)) {
        showDiscountAppliedSuccess(b.billPreview);
      }
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
        lastAppliedManualRef.current = {
          type: b.billDiscountType,
          value: String(b.billDiscountValue ?? ""),
        };
      } else {
        setBillDiscountType("");
        setBillDiscountValue("");
        lastAppliedManualRef.current = null;
      }
      setError("");
      const manualApplied = (b.billPreview?.manualDiscountAmount ?? 0) > 0;
      if (manualApplied && b.billDiscountType) {
        showDiscountAppliedSuccess(b.billPreview);
      }
    },
    onError: (e: Error) => setError(e.message),
  });

  const cgstNum = Number(cgstInput);
  const sgstNum = Number(sgstInput);
  const taxValid = Number.isFinite(cgstNum) && cgstNum >= 0 && Number.isFinite(sgstNum) && sgstNum >= 0;

  const displayGrandTotal = useMemo(() => {
    if (!billPreview) return 0;
    if (!taxOverridden) {
      return billPreview.grandTotal ?? 0;
    }
    const fee = billPreview.membershipFeeAmount ?? 0;
    const cgst = Number.isFinite(cgstNum) && cgstNum >= 0 ? cgstNum : 0;
    const sgst = Number.isFinite(sgstNum) && sgstNum >= 0 ? sgstNum : 0;
    const taxable = billPreview.taxableAmount ?? 0;
    return Math.round((taxable + cgst + sgst + fee) * 100) / 100;
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
      if (booking.billPreview) {
        setBillPreview(booking.billPreview);
        setCgstInput(String(booking.billPreview.cgstAmount ?? 0));
        setSgstInput(String(booking.billPreview.sgstAmount ?? 0));
      }
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
    if (taxOverridden && gstEffective) {
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
    setRemovedToast(null);
    setStep(target as Step);
    if (bookingId && target < 3) {
      router.replace(`/manager/walk-in?bookingId=${bookingId}&edit=1`);
    }
  }

  async function loadRegistrationCardForCustomer(id: string) {
    try {
      const card = await api.getCustomerRegistrationCard(id, branchId);
      setRegistrationCard(card);
      setVisitPassId(card.visitPassId);
      setVisitPassInput(card.visitPassId);
    } catch {
      setRegistrationCard(null);
    }
  }

  function clearExistingLookupResult() {
    setCustomerId("");
    setCustomerName("");
    savedCustomerNameRef.current = "";
    setVisitPassId("");
    setMembership(null);
    setRegistrationCard(null);
  }

  function invalidateExistingCustomerLookup(editedField: CustomerLookupField) {
    bumpLookupGeneration(existingLookupGenerationRef);
    existingLookupRef.current = "";
    existingSearchFieldRef.current = editedField;
    setExistingLookupStatus("idle");
    clearExistingLookupResult();
    if (editedField === "phone" && existingAutoFilledRef.current.visitPass) {
      setVisitPassInput("");
    }
    if (editedField === "visitPass" && existingAutoFilledRef.current.phone) {
      setPhone("");
    }
    existingAutoFilledRef.current = emptyAutoFilledFields();
  }

  function applyExistingCustomer(
    c: {
      id: string;
      name: string;
      visitPassId?: string | null;
      phone?: string | null;
      society?: string | null;
      flatUnit?: string | null;
    },
    passRaw: string,
    phoneRaw: string
  ) {
    setCustomerId(c.id);
    setCustomerName(c.name);
    savedCustomerNameRef.current = c.name;
    setVisitPassId(c.visitPassId || "");
    const passWasEmpty = !normalizeVisitPassInput(passRaw);
    const phoneWasEmpty = digitsOnly(phoneRaw).length === 0;
    const phoneDigits = c.phone ? digitsOnly(c.phone) : "";
    if (c.visitPassId && passWasEmpty) {
      setVisitPassInput(c.visitPassId);
    }
    if (phoneDigits && phoneWasEmpty) {
      setPhone(phoneDigits);
    }
    existingAutoFilledRef.current = {
      visitPass: Boolean(c.visitPassId && passWasEmpty),
      phone: Boolean(phoneDigits && phoneWasEmpty),
    };
    setSociety(c.society || society);
    setFlat(c.flatUnit || flat);
    setExistingLookupStatus("found");
    void loadRegistrationCardForCustomer(c.id);
  }

  function recordExistingCustomerAndAdvance(
    c: {
      id: string;
      name: string;
      visitPassId?: string | null;
      phone?: string | null;
    },
    lookupKey: string
  ) {
    if (bookingId || step !== 1) return;
    if (existingAutoAdvanceKeyRef.current === lookupKey) return;
    existingAutoAdvanceKeyRef.current = lookupKey;
    pushRecentCustomer(branchId, {
      visitPassId: c.visitPassId || visitPassInput || visitPassId,
      name: c.name,
      customerId: c.id,
      phone: c.phone ? digitsOnly(c.phone) : phone || undefined,
      society,
      flat,
    });
    setRecentCustomers(getRecentCustomers(branchId));
    setStep(2);
  }

  async function lookupExistingCustomer(passRaw: string, phoneRaw: string) {
    const passNorm = normalizeVisitPassInput(passRaw);
    const phoneNorm = normalizeIndianMobile(phoneRaw);
    const passValid = Boolean(passNorm && isValidVisitPassFormat(passNorm));
    const phoneValid = Boolean(phoneNorm && isValidIndianMobile(phoneRaw));
    const lookupField = resolveLookupField(existingSearchFieldRef.current, phoneValid, passValid);

    if (!lookupField) {
      existingLookupRef.current = "";
      setExistingLookupStatus("idle");
      if (!passNorm && digitsOnly(phoneRaw).length === 0) {
        clearExistingLookupResult();
      }
      return;
    }

    const lookupKey =
      lookupField === "visitPass"
        ? `pass:${passNorm}`
        : `phone:${phoneNorm}`;

    if (existingLookupRef.current === lookupKey && existingLookupStatus === "found") {
      return;
    }

    const generationAtStart = existingLookupGenerationRef.current;
    existingLookupRef.current = lookupKey;
    setExistingLookupStatus("loading");
    setError("");
    clearExistingLookupResult();

    try {
      const customer =
        lookupField === "visitPass"
          ? await api.findCustomerByVisitPass(passNorm)
          : await api.findCustomerByPhone(phoneNorm!);
      if (isLookupGenerationStale(existingLookupGenerationRef, generationAtStart)) return;
      if (existingLookupRef.current !== lookupKey) return;
      applyExistingCustomer(customer, passRaw, phoneRaw);
      recordExistingCustomerAndAdvance(customer, lookupKey);
    } catch {
      if (isLookupGenerationStale(existingLookupGenerationRef, generationAtStart)) return;
      if (existingLookupRef.current !== lookupKey) return;
      clearExistingLookupResult();
      setExistingLookupStatus("not_found");
      if (!bookingId && step === 1) {
        switchToNewGuestFlow({ preserveIdentifiers: true, fromExistingNotFound: true });
      }
    }
  }

  function switchToNewGuestFlow(opts?: { preserveIdentifiers?: boolean; fromExistingNotFound?: boolean }) {
    const preservedPhone = phone;
    const preservedPass = visitPassInput;
    setCustomerLookupMode("new");
    setExistingLookupStatus("idle");
    existingLookupRef.current = "";
    bumpLookupGeneration(existingLookupGenerationRef);
    existingSearchFieldRef.current = null;
    existingAutoFilledRef.current = emptyAutoFilledFields();
    existingAutoAdvanceKeyRef.current = "";
    setCustomerId("");
    setCustomerName("");
    setMembership(null);
    setRegistrationCard(null);
    setError("");
    setNewGuestFromExisting(Boolean(opts?.fromExistingNotFound));
    bumpLookupGeneration(newPhoneLookupGenerationRef);
    newPhoneAutoFilledRef.current = { name: false, visitPass: false };
    lookupPhoneRef.current = "";
    setLookupState("idle");
    if (opts?.preserveIdentifiers) {
      setPhone(preservedPhone);
      setVisitPassInput(preservedPass);
      setVisitPassId("");
    } else {
      setPhone("");
      setVisitPassInput("");
      setVisitPassId("");
    }
  }

  function clearNewPhoneLookupDerived() {
    setCustomerId("");
    setMembership(null);
    setRegistrationCard(null);
    if (newPhoneAutoFilledRef.current.visitPass) {
      setVisitPassId("");
      setVisitPassInput("");
    }
    if (newPhoneAutoFilledRef.current.name) {
      setCustomerName("");
    }
    newPhoneAutoFilledRef.current = { name: false, visitPass: false };
  }

  function invalidateNewPhoneLookup() {
    bumpLookupGeneration(newPhoneLookupGenerationRef);
    lookupPhoneRef.current = "";
    setLookupState("idle");
    clearNewPhoneLookupDerived();
  }

  async function lookupCustomer(rawPhone: string) {
    const normalized = normalizeIndianMobile(rawPhone);
    if (!normalized) return;
    if (lookupPhoneRef.current === normalized && lookupState === "done") return;

    const generationAtStart = newPhoneLookupGenerationRef.current;
    lookupPhoneRef.current = normalized;
    setLookupState("loading");
    setError("");
    try {
      const c = await api.findCustomerByPhone(normalized);
      if (isLookupGenerationStale(newPhoneLookupGenerationRef, generationAtStart)) return;
      if (lookupPhoneRef.current !== normalized) return;
      setCustomerId(c.id);
      setCustomerName(c.name);
      savedCustomerNameRef.current = c.name;
      newPhoneAutoFilledRef.current = {
        name: true,
        visitPass: Boolean(c.visitPassId),
      };
      if (c.visitPassId) {
        setVisitPassId(c.visitPassId);
        setVisitPassInput(c.visitPassId);
      }
      setSociety(c.society || society);
      setFlat(c.flatUnit || "");
    } catch {
      if (isLookupGenerationStale(newPhoneLookupGenerationRef, generationAtStart)) return;
      if (lookupPhoneRef.current !== normalized) return;
      clearNewPhoneLookupDerived();
    } finally {
      if (
        !isLookupGenerationStale(newPhoneLookupGenerationRef, generationAtStart) &&
        lookupPhoneRef.current === normalized
      ) {
        setLookupState("done");
      }
    }
  }

  useEffect(() => {
    if (bookingId || customerLookupMode !== "new") return;
    if (digitsOnly(phone).length === 10 && isValidIndianMobile(phone)) {
      void lookupCustomer(phone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once phone reaches a valid 10-digit length
  }, [phone, bookingId, customerLookupMode]);

  useEffect(() => {
    if (bookingId || customerLookupMode !== "existing") return;
    const timer = setTimeout(() => {
      void lookupExistingCustomer(visitPassInput, phone);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounced lookup when phone or pass changes
  }, [visitPassInput, phone, customerLookupMode, bookingId]);

  async function persistCustomerNameIfChanged() {
    if (!customerId || billingLocked) return;
    const trimmed = customerName.trim();
    if (!trimmed) {
      setError(t("nameRequired"));
      setCustomerName(savedCustomerNameRef.current);
      return;
    }
    if (trimmed === savedCustomerNameRef.current) return;
    try {
      const updated = await api.updateCustomer(customerId, { name: trimmed });
      savedCustomerNameRef.current = updated.name;
      setCustomerName(updated.name);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("nameRequired"));
      setCustomerName(savedCustomerNameRef.current);
    }
  }

  function applyRecentCustomer(rc: RecentCustomer) {
    setPendingMembershipPlanId("");
    setError("");
    setCustomerLookupMode("existing");
    existingAutoFilledRef.current = emptyAutoFilledFields();
    existingSearchFieldRef.current = rc.visitPassId ? "visitPass" : "phone";
    setVisitPassInput(rc.visitPassId || "");
    setPhone(rc.phone ? digitsOnly(rc.phone) : "");
    if (rc.visitPassId || rc.phone) {
      bumpLookupGeneration(existingLookupGenerationRef);
      void lookupExistingCustomer(rc.visitPassId || "", rc.phone || "");
      return;
    }
    setExistingLookupStatus("idle");
    existingLookupRef.current = "";
    setCustomerName(rc.name);
    savedCustomerNameRef.current = rc.name;
    setCustomerId(rc.customerId || "");
    setVisitPassId(rc.visitPassId || "");
    setSociety(rc.society || society);
    setFlat(rc.flat || "");
  }

  const phoneValid = isValidIndianMobile(phone);
  const visitPassLooksValid = isValidVisitPassFormat(visitPassInput);
  const existingLookupReady = visitPassLooksValid || phoneValid;

  const continueCustomerDisabled =
    saving ||
    (customerLookupMode === "existing"
      ? existingLookupStatus !== "found" || !customerId
      : !customerName.trim() ||
        (phoneNumberRequired ? !phoneValid : optionalPhoneBlocksContinue(phone, phoneValid)));

  async function continueFromCustomerStep() {
    setError("");
    if (customerLookupMode === "existing") {
      if (!existingLookupReady) {
        setError(t("existingLookupRequired"));
        return;
      }
      if (existingLookupStatus !== "found" || !customerId) {
        if (existingLookupStatus === "loading") return;
        return;
      }
      await persistCustomerNameIfChanged();
      pushRecentCustomer(branchId, {
        visitPassId: visitPassId || visitPassInput,
        name: customerName,
        customerId,
        phone: phone || undefined,
        society,
        flat,
      });
      setRecentCustomers(getRecentCustomers(branchId));
      setStep(2);
      return;
    }

    const normalized = normalizeIndianMobile(phone);
    if (!customerName.trim()) {
      setError(t("nameRequired"));
      return;
    }
    if (phoneNumberRequired && !normalized) {
      setError(t("phoneInvalid"));
      return;
    }
    if (optionalPhoneBlocksContinue(phone, phoneValid)) {
      setError(t("phoneInvalid"));
      return;
    }
    if (bookingId) {
      setStep(2);
      return;
    }
    try {
      let id = customerId;
      let isNew = false;
      let createdVisitPassId = visitPassId;
      if (!id) {
        const existing = await matchCustomerByExactName(customerName.trim());
        if (existing === "ambiguous") {
          setError(t("multipleCustomersSameName", { name: customerName.trim() }));
          return;
        }
        if (existing) {
          id = existing.id;
          setCustomerId(id);
          setVisitPassId(existing.visitPassId || "");
          setVisitPassInput(existing.visitPassId || "");
          if (existing.society) setSociety(existing.society);
          if (existing.flatUnit) setFlat(existing.flatUnit);
          createdVisitPassId = existing.visitPassId || "";
        } else {
          const c = await api.createCustomer({
            name: customerName.trim(),
            phone: normalized || undefined,
            branchId,
            society,
            flatUnit: flat,
          });
          id = c.id;
          isNew = true;
          setCustomerId(id);
          createdVisitPassId = c.visitPassId || "";
          setVisitPassId(createdVisitPassId);
        }
      }
      savedCustomerNameRef.current = customerName.trim();
      pushRecentCustomer(branchId, {
        phone: normalized || undefined,
        visitPassId: createdVisitPassId || undefined,
        name: customerName.trim(),
        customerId: id,
        society,
        flat,
      });
      setRecentCustomers(getRecentCustomers(branchId));
      if (isNew) {
        await loadRegistrationCardForCustomer(id);
      }
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

  function toggleService(s: BranchServiceItem) {
    setCart((prev) => {
      const existingIdx = prev.findIndex((c) => c.branchServiceId === s.id);
      if (existingIdx >= 0) {
        setRemovedToast(s.serviceName);
        return prev.filter((_, i) => i !== existingIdx);
      }
      pushRecentService(branchId, s.id);
      setRecentServiceIds(getRecentServiceIds(branchId));
      setAddedToast(s.serviceName);
      return [
        ...prev,
        {
          branchServiceId: s.id,
          serviceName: s.serviceName,
          basePrice: s.price,
          priceExtra: 0,
          variablePricing: !!s.variablePricing,
          staffId: defaultStaffId(prev),
        },
      ];
    });
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

  async function applyLinePrice(idx: number, finalPrice: number) {
    const item = cart[idx];
    if (!item) return;
    const extra = Math.max(0, finalPrice - item.basePrice);
    const nextCart = cart.map((c, i) => (i === idx ? { ...c, priceExtra: extra } : c));
    setCart(nextCart);
    setPriceEditIdx(null);

    if (step === 3 && bookingId && !billingLocked) {
      setSavingPrice(true);
      setError("");
      try {
        const b = await api.updateBookingLines(bookingId, toLinePayload(nextCart));
        hydrateFromBooking(b);
      } catch (e) {
        setError(e instanceof Error ? e.message : tCommon("failed"));
      } finally {
        setSavingPrice(false);
      }
    }
  }

  function toLinePayload(items: CartItem[]) {
    return items.map((c) => {
      const total = cartLinePrice(c);
      const payload: { branchServiceId: string; staffId: string; quantity: number; unitPrice?: number } = {
        branchServiceId: c.branchServiceId,
        staffId: c.staffId,
        quantity: 1,
      };
      if (total > c.basePrice) {
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

  async function resolveCustomerId(): Promise<string> {
    if (customerId) return customerId;
    const normalized = normalizeIndianMobile(phone);
    if (!customerName.trim()) {
      throw new Error(t("customerRequiredBeforeSave"));
    }
    if (phoneNumberRequired && !normalized) {
      throw new Error(t("customerRequiredBeforeSave"));
    }
    const existing = await matchCustomerByExactName(customerName.trim());
    if (existing === "ambiguous") {
      throw new Error(t("multipleCustomersSameName", { name: customerName.trim() }));
    }
    if (existing) {
      setCustomerId(existing.id);
      setVisitPassId(existing.visitPassId || "");
      pushRecentCustomer(branchId, {
        phone: normalized || undefined,
        visitPassId: existing.visitPassId,
        name: existing.name,
        customerId: existing.id,
        society: existing.society,
        flat: existing.flatUnit,
      });
      return existing.id;
    }
    const c = await api.createCustomer({
      name: customerName.trim(),
      phone: normalized || undefined,
      branchId,
      society: society || undefined,
      flatUnit: flat || undefined,
    });
    setCustomerId(c.id);
    setVisitPassId(c.visitPassId || "");
    pushRecentCustomer(branchId, {
      phone: normalized || undefined,
      visitPassId: c.visitPassId,
      name: customerName.trim(),
      customerId: c.id,
      society,
      flat,
    });
    setRecentCustomers(getRecentCustomers(branchId));
    return c.id;
  }

  async function persistServices(keepOpen: boolean): Promise<Booking> {
    if (cart.length === 0) {
      throw new Error(t("cartEmpty"));
    }

    if (staff.length === 0) {
      throw new Error(t("noStaffConfigured"));
    }

    let workingCart = cart;
    if (cart.some((c) => !c.staffId)) {
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

    const resolvedCustomerId = await resolveCustomerId();

    return api.createBooking({
      branchId,
      customerId: resolvedCustomerId,
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
      setCartSheetOpen(false);
      setHubTab("open");
      setScreen("hub");
      setStep(1);
      router.replace("/manager/walk-in");
      await queryClient.invalidateQueries({ queryKey: ["open-visits", branchId] });
      await queryClient.invalidateQueries({ queryKey: ["bookings"] });
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

  function applyManualDiscount(silent = false) {
    const value = Number(billDiscountValue);
    if (!billDiscountType || !Number.isFinite(value) || value <= 0) {
      if (!silent) setError(t("manualDiscountInvalid"));
      return false;
    }
    setSelectedCouponId("");
    setSelectedOfferId("");
    if (!bookingId) return false;
    applyBillDiscount.mutate({
      billDiscountType: billDiscountType as "FLAT" | "PERCENT",
      billDiscountValue: value,
    });
    return true;
  }

  function clearManualDiscount() {
    setBillDiscountType("");
    setBillDiscountValue("");
    lastAppliedManualRef.current = null;
    if (bookingId) applyBillDiscount.mutate({ clearDiscount: true });
  }

  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((s, c) => s + cartLinePrice(c), 0);
    const estimatedTax = gstEffective
      ? cart.reduce((s, c) => {
          const rate = servicesById.get(c.branchServiceId)?.gstRate ?? 0;
          return s + (cartLinePrice(c) * rate) / 100;
        }, 0)
      : 0;
    const half = estimatedTax / 2;
    return {
      subtotal,
      estimatedTax,
      estimatedCgst: half,
      estimatedSgst: half,
      estimatedGrand: subtotal + estimatedTax,
    };
  }, [cart, servicesById, gstEffective]);
  const cartHasFreshBill = !!billPreview && (billPreview.lines?.length ?? 0) === cart.length;

  const promoLocked = !!selectedCouponId || !!selectedOfferId;
  const manualDiscountApplied = (billPreview?.manualDiscountAmount ?? 0) > 0;

  useEffect(() => {
    if (!bookingId || billingLocked || promoLocked || applyBillDiscount.isPending) return;

    const trimmed = billDiscountValue.trim();
    const value = Number(trimmed);
    const hasDraft = !!billDiscountType && Number.isFinite(value) && value > 0;

    if (!hasDraft) {
      if (manualDiscountApplied && !trimmed) {
        const timer = window.setTimeout(() => clearManualDiscount(), 500);
        return () => window.clearTimeout(timer);
      }
      return;
    }

    const draft = { type: billDiscountType, value: trimmed };
    if (
      lastAppliedManualRef.current?.type === draft.type &&
      lastAppliedManualRef.current?.value === draft.value
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      applyManualDiscount(true);
    }, 650);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounced apply from discount draft
  }, [billDiscountType, billDiscountValue, bookingId, billingLocked, promoLocked, manualDiscountApplied]);

  const adjustmentSummary = useMemo(() => {
    const parts: string[] = [];
    if (selectedCouponId) {
      const coupon = coupons.find((c) => c.id === selectedCouponId);
      if (coupon) parts.push(coupon.code ?? coupon.name);
    }
    if (selectedOfferId) {
      const offer = offers.find((o) => o.id === selectedOfferId);
      if (offer) parts.push(offer.name);
    }
    if (manualDiscountApplied && billPreview?.manualDiscountLabel) {
      parts.push(billPreview.manualDiscountLabel);
    } else if (manualDiscountApplied) {
      parts.push(t("manualDiscount"));
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  }, [selectedCouponId, selectedOfferId, coupons, offers, manualDiscountApplied, billPreview?.manualDiscountLabel, t]);

  const discountSavings =
    (billPreview?.manualDiscountAmount ?? 0) + (billPreview?.promoDiscountAmount ?? 0);
  const hasBillDiscount = discountSavings > 0 || manualDiscountApplied || promoLocked;

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
              <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
                <button type="button" onClick={acceptDraft} className={`${btnPrimary} py-2 px-3 text-sm min-h-11 w-full sm:w-auto justify-center touch-manipulation`}>
                  {t("restoreDraft")}
                </button>
                <button type="button" onClick={dismissDraft} className={`${btnSecondary} py-2 px-3 text-sm min-h-11 w-full sm:w-auto justify-center touch-manipulation`}>
                  {t("dismissDraft")}
                </button>
              </div>
            </div>
          </AlertBanner>
        )}

        {hubTab === "history" ? (
          <BookingsHistoryPanel
            embedded
            onNewVisit={startNewVisit}
            wizardBaseHref="/manager/walk-in"
            initialCustomerId={urlCustomerId}
            navigationScope="manager"
          />
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
              <div className="space-y-1.5">
                {openVisits.map((v) => {
                  const readyForBilling = v.status === "READY_FOR_BILLING";
                  const servicesLabel = v.lines?.map((l) => l.serviceName).join(", ") || "—";
                  const amountLabel = v.billPreview ? formatCurrency(v.billPreview.grandTotal, localeKit) : "—";
                  const actionLabel = readyForBilling ? t("billNow") : t("continueVisit");

                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => void openVisit(v.id, readyForBilling ? { preferBill: true } : undefined)}
                      className="group flex w-full items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-left touch-manipulation transition hover:border-[var(--brand)]/35 active:bg-[var(--surface-muted)]/60 min-h-[3.25rem]"
                      aria-label={`${actionLabel}: ${v.customerName}, ${amountLabel}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="min-w-0 truncate text-sm font-semibold text-[var(--text-primary)]">
                            {v.customerName}
                          </p>
                          <StatusBadge status={v.status} />
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-[var(--text-secondary)]">
                          {v.customerPhone} · {formatTenantDateTime(v.createdAt, localeKit)}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-[var(--text-tertiary)]">{servicesLabel}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-0.5 self-center pl-1">
                        <p className="text-sm font-bold tabular-nums leading-none text-[var(--brand-text)]">
                          {amountLabel}
                        </p>
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5 text-[11px] font-semibold leading-none",
                            readyForBilling
                              ? "text-[var(--brand-text)]"
                              : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]",
                          )}
                        >
                          {actionLabel}
                          <ChevronRight
                            className="h-3.5 w-3.5 shrink-0 transition group-hover:translate-x-0.5"
                            aria-hidden
                          />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        )}
      </div>
    );
  }

  const flowTitle = bookingId
    ? customerName
      ? visitPassId
        ? `${customerName} · ${visitPassId}`
        : customerName
      : steps[Math.max(0, step - 1)]
    : t("title");

  const flowBackLabel =
    step === 3
      ? tCommon("backTo", { page: t("stepServices") })
      : step === 2
        ? serviceQuery.trim()
          ? t("clearSearch")
          : catalogSub
            ? t("backToServiceTypes")
            : catalogTop
              ? t("backToAllCategories")
              : t("backToCategories")
        : urlCustomerId
          ? tCustomers("backToCustomers")
          : t("backToOpenVisits");

  const showFlowBackButton = !billingLocked && (step !== 2 || catalogCanGoBack());

  const flowBackButton = showFlowBackButton ? (
    <button
      type="button"
      onClick={() => void goBackInFlow()}
      className="inline-flex shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 text-[var(--brand-text)] hover:opacity-90 touch-manipulation min-h-9 min-w-9"
      aria-label={flowBackLabel}
    >
      <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
    </button>
  ) : null;

  const stepSelectHandler = billingLocked ? undefined : goToStep;
  const showFlowChrome = step === 2 || step === 3;

  return (
    <div
      className={cn(
        "space-y-2 w-full min-w-0 mx-auto",
        step === 2
          ? "max-w-6xl"
          : step === 3
            ? "max-w-3xl xl:max-w-4xl pb-[max(0.5rem,env(safe-area-inset-bottom))]"
            : "max-w-6xl pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      )}
    >
      {showFlowChrome ? (
        <div
          className={cn(
            "rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-sm w-full min-w-0",
            step === 2 && "max-lg:sticky max-lg:top-0 max-lg:z-20 max-lg:shadow-sm",
            step === 3 && "max-w-3xl xl:max-w-4xl mx-auto"
          )}
        >
          {step === 3 ? (
            <>
              <div className="flex items-center gap-2 min-w-0 px-3 py-2 md:hidden">
                {flowBackButton}
                <div className="min-w-0 flex-1">
                  <p className="min-w-0 truncate text-sm font-bold leading-tight text-[var(--text-primary)]">
                    {customerName || t("namePlaceholder")}
                  </p>
                  {(visitPassId || membership) && (
                    <div className="mt-0.5 flex flex-wrap items-center gap-1">
                      {visitPassId && (
                        <span className="text-[10px] font-mono text-[var(--text-tertiary)]">{visitPassId}</span>
                      )}
                      {membership && (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-px text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                          {t("memberPercentChip", { percent: membership.benefitPercent ?? 10 })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="shrink-0 border-l border-[var(--border)] pl-2.5 text-right">
                  {billPreview ? (
                    <>
                      <p className="text-base font-bold tabular-nums leading-none text-[var(--brand-text)]">
                        {formatMoney(displayGrandTotal, localeKit)}
                      </p>
                      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                        {tCommon("grandTotal")}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-base font-bold tabular-nums leading-none text-[var(--text-tertiary)] animate-pulse">
                        …
                      </p>
                      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                        {tCommon("loading")}
                      </p>
                    </>
                  )}
                </div>
              </div>
              <div className="border-t border-[var(--border)] bg-[var(--surface-muted)]/30 px-1 py-0.5 md:hidden">
                <WalkInCompactSteps embedded steps={steps} current={step} onStepSelect={stepSelectHandler} />
              </div>
              <div className="hidden md:block px-3 py-3 sm:px-4">
                <div className="flex items-start gap-3 min-w-0">
                  {flowBackButton}
                  <div className="min-w-0 flex-1">
                    <WizardSteps
                      steps={steps}
                      current={step}
                      onStepSelect={stepSelectHandler}
                      className="!rounded-none !border-0 !shadow-none !p-0 !bg-transparent"
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 min-w-0 border-t border-[var(--border)]/70 pt-2.5">
                  <p className="min-w-0 truncate text-sm font-bold text-[var(--text-primary)]">
                    {customerName || t("namePlaceholder")}
                  </p>
                  {visitPassId && (
                    <span className="hidden lg:inline font-mono text-[10px] text-[var(--text-tertiary)] shrink-0">
                      {visitPassId}
                    </span>
                  )}
                  {membership && (
                    <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-100 px-1.5 py-px text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                      {t("memberPercentChip", { percent: membership.benefitPercent ?? 10 })}
                    </span>
                  )}
                  <div className="ml-auto shrink-0 pl-2 text-right">
                    {billPreview ? (
                      <>
                        <p className="text-sm font-bold tabular-nums leading-none text-[var(--brand-text)] lg:text-base">
                          {formatMoney(displayGrandTotal, localeKit)}
                        </p>
                        <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                          {tCommon("grandTotal")}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-bold tabular-nums leading-none text-[var(--text-tertiary)] animate-pulse lg:text-base">
                          …
                        </p>
                        <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                          {tCommon("loading")}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-2 min-w-0 px-3 py-2 sm:px-4">
                {flowBackButton ? <div className="pt-0.5">{flowBackButton}</div> : null}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 min-w-0">
                    <p className="min-w-0 truncate text-sm font-bold leading-tight text-[var(--text-primary)]">
                      {customerName || t("namePlaceholder")}
                    </p>
                    {!billingLocked && (
                      <button
                        type="button"
                        onClick={() => goToStep(1)}
                        className="inline-flex shrink-0 rounded-md p-1 text-[var(--brand-text)] hover:bg-[var(--surface-muted)] touch-manipulation"
                        aria-label={t("editCustomer")}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    )}
                  </div>
                  <WalkInCatalogTrail segments={catalogTrailSegments} className="mt-0.5" />
                  {(visitPassId || membership) && (
                    <div className="mt-0.5 flex flex-wrap items-center gap-1 max-lg:hidden">
                      {visitPassId && (
                        <span className="text-[10px] font-mono text-[var(--text-tertiary)]">{visitPassId}</span>
                      )}
                      {membership && (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-px text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                          {t("memberPercentChip", { percent: membership.benefitPercent ?? 10 })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="shrink-0 border-l border-[var(--border)] pl-2.5 text-right">
                  {cart.length > 0 ? (
                    <>
                      <p className="text-sm font-bold tabular-nums leading-none text-[var(--brand-text)] max-lg:text-[0.9375rem]">
                        {cartTotalDisplay}
                      </p>
                      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                        {t("mobileCartCount", { count: cart.length })}
                      </p>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="mx-auto h-4 w-4 text-[var(--text-tertiary)]" aria-hidden />
                      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                        {t("addServices")}
                      </p>
                    </>
                  )}
                </div>
              </div>
              <div
                className="border-t border-[var(--border)] bg-[var(--surface-muted)]/20 px-2 py-1 md:hidden"
                aria-hidden
              >
                <div className="h-0.5 overflow-hidden rounded-full bg-[var(--border)]">
                  <div
                    className="h-full rounded-full bg-[var(--brand)] transition-all duration-300"
                    style={{ width: `${steps.length > 1 ? ((step - 1) / (steps.length - 1)) * 100 : 100}%` }}
                  />
                </div>
              </div>
              <div className="hidden md:block border-t border-[var(--border)] px-2 sm:px-3">
                <WizardSteps
                  steps={steps}
                  current={step}
                  onStepSelect={stepSelectHandler}
                  className="!rounded-none !border-0 !shadow-none !p-2 sm:!p-3 !bg-transparent"
                />
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 min-w-0">
            {flowBackButton}
            <h1 className="min-w-0 flex-1 text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight truncate pt-0.5">
              {flowTitle}
            </h1>
          </div>
          <WalkInCompactSteps steps={steps} current={step} onStepSelect={stepSelectHandler} />
          <div className="hidden md:block">
            <WizardSteps steps={steps} current={step} onStepSelect={stepSelectHandler} className="!p-2.5" />
          </div>
        </>
      )}

      {visitPassId && customerName && step === 1 && (
        <WalkInVisitPassBanner
          visitPassId={visitPassId}
          customerName={customerName}
          card={registrationCard}
          step={step}
        />
      )}

      {error && <AlertBanner variant="error">{error}</AlertBanner>}
      {draftRestoredNotice && step === 1 && (
        <AlertBanner variant="info">{t("draftRestored")}</AlertBanner>
      )}
      {bookingId && !billingLocked && step !== 3 && (
        <p className="text-xs text-[var(--text-secondary)]">
          {t("visitStatus", { status: bookingStatus || "IN_PROGRESS" })}
        </p>
      )}

      {step === 1 && (
        <Card className="space-y-4">
          {!bookingId && (
            <SegmentedControl
              value={customerLookupMode}
              onChange={(v) => {
                const mode = v as "new" | "existing";
                setCustomerLookupMode(mode);
                setError("");
                if (mode === "new") {
                  setExistingLookupStatus("idle");
                  existingLookupRef.current = "";
                  bumpLookupGeneration(existingLookupGenerationRef);
                  existingSearchFieldRef.current = null;
                  existingAutoFilledRef.current = emptyAutoFilledFields();
                  existingAutoAdvanceKeyRef.current = "";
                } else {
                  setNewGuestFromExisting(false);
                  bumpLookupGeneration(newPhoneLookupGenerationRef);
                  newPhoneAutoFilledRef.current = { name: false, visitPass: false };
                  lookupPhoneRef.current = "";
                  setLookupState("idle");
                }
              }}
              options={[
                { id: "existing", label: t("lookupExisting") },
                { id: "new", label: t("lookupNew") },
              ]}
            />
          )}

          {!bookingId && recentCustomers.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                {t("recentCustomers")}
              </p>
              <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain max-w-full min-w-0 pb-0.5 -mx-0.5 px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {recentCustomers.map((rc) => (
                  <button
                    key={rc.customerId || rc.visitPassId || rc.phone || rc.name}
                    type="button"
                    onClick={() => applyRecentCustomer(rc)}
                    className="shrink-0 min-w-[9rem] max-w-[12rem] text-left px-3 py-2.5 min-h-12 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--brand)] transition touch-manipulation"
                  >
                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{rc.name}</p>
                    <p className="text-[11px] text-[var(--text-tertiary)] truncate">
                      {rc.visitPassId || rc.phone || "—"}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {customerLookupMode === "existing" ? (
            <div className="space-y-3 min-w-0">
              <p className="text-xs sm:text-sm text-[var(--text-tertiary)] leading-relaxed">{t("existingLookupHint")}</p>
              <div className="min-w-0">
                <input
                  placeholder={t("phonePlaceholder")}
                  value={phone}
                  onChange={(e) => {
                    invalidateExistingCustomerLookup("phone");
                    setPhone(digitsOnly(e.target.value));
                  }}
                  onBlur={() => {
                    if (existingLookupReady) void lookupExistingCustomer(visitPassInput, phone);
                  }}
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={13}
                  className={cn(
                    inputClass,
                    existingLookupStatus === "found" && phoneValid && "border-emerald-500 ring-2 ring-emerald-500/20",
                    existingLookupStatus === "not_found" && phoneValid && "border-amber-500 ring-2 ring-amber-500/20"
                  )}
                  disabled={!!bookingId}
                />
                {phone.length > 0 && !phoneValid && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">{t("phoneInvalid")}</p>
                )}
              </div>
              <div className="min-w-0">
                <input
                  placeholder={t("visitPassPlaceholder")}
                  value={visitPassInput}
                  onChange={(e) => {
                    invalidateExistingCustomerLookup("visitPass");
                    setVisitPassInput(e.target.value.toUpperCase());
                  }}
                  onBlur={() => {
                    if (existingLookupReady) void lookupExistingCustomer(visitPassInput, phone);
                  }}
                  autoComplete="off"
                  spellCheck={false}
                  className={cn(
                    inputClass,
                    "font-mono text-[0.9375rem] sm:text-sm",
                    existingLookupStatus === "found" && visitPassLooksValid && "border-emerald-500 ring-2 ring-emerald-500/20",
                    existingLookupStatus === "not_found" && visitPassLooksValid && "border-amber-500 ring-2 ring-amber-500/20"
                  )}
                  disabled={!!bookingId}
                  aria-invalid={existingLookupStatus === "not_found"}
                />
                {!visitPassLooksValid && visitPassInput.trim().length > 0 && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">{t("visitPassInvalid")}</p>
                )}
              </div>
              {existingLookupStatus === "loading" && (
                <p className="text-xs text-[var(--text-secondary)]">{t("existingLookupLoading")}</p>
              )}

              <div className="min-w-0">
                <input
                  placeholder={t("namePlaceholder")}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  onBlur={() => void persistCustomerNameIfChanged()}
                  disabled={existingLookupStatus !== "found" || !customerId || billingLocked}
                  autoComplete="name"
                  className={cn(
                    inputClass,
                    existingLookupStatus === "found" &&
                      customerName &&
                      "border-emerald-500 ring-2 ring-emerald-500/20"
                  )}
                  aria-label={tCommon("name")}
                />
                {existingLookupStatus === "found" && customerId && (
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-1">{tCustomers("editName")}</p>
                )}
              </div>
            </div>
          ) : (
            <>
              {newGuestFromExisting && (
                <AlertBanner variant="info">
                  <p className="leading-relaxed break-words">{t("existingFirstTime")}</p>
                </AlertBanner>
              )}
              {!phoneNumberRequired && (
                <input
                  placeholder={t("namePlaceholder")}
                  value={customerName}
                  onChange={(e) => {
                    newPhoneAutoFilledRef.current.name = false;
                    setCustomerName(e.target.value);
                  }}
                  className={inputClass}
                  disabled={!!bookingId}
                  autoComplete="name"
                />
              )}
              <div>
                <input
                  placeholder={
                    phoneNumberRequired ? t("phonePlaceholder") : t("phoneOptionalPlaceholder")
                  }
                  value={phone}
                  onChange={(e) => {
                    invalidateNewPhoneLookup();
                    setPhone(digitsOnly(e.target.value));
                  }}
                  onBlur={() => {
                    if (!bookingId) void lookupCustomer(phone);
                  }}
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={13}
                  className={inputClass}
                  disabled={!!bookingId}
                />
                {shouldShowInvalidPhoneHint(phone, phoneValid, phoneNumberRequired) && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">{t("phoneInvalid")}</p>
                )}
                {!phoneNumberRequired && (
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">{t("phoneOptionalHint")}</p>
                )}
                {lookupState === "loading" && (
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">{tCommon("loading")}</p>
                )}
              </div>
              {phoneNumberRequired && (
                <input
                  placeholder={t("namePlaceholder")}
                  value={customerName}
                  onChange={(e) => {
                    newPhoneAutoFilledRef.current.name = false;
                    setCustomerName(e.target.value);
                  }}
                  className={inputClass}
                  disabled={!!bookingId}
                  autoComplete="name"
                />
              )}
            </>
          )}

          {customerLookupMode === "new" && (
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
          )}

          {membership && (
            <Callout
              variant="success"
              icon={<CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden />}
              title={t("memberBadge", {
                plan: membership.planName || "Member",
                percent: membership.benefitPercent ?? 10,
              })}
            >
              <p className="text-xs">
                {membership.cardNumber} · {t("validUntil", { date: membership.endsOn })}
              </p>
            </Callout>
          )}

          <button
            onClick={() => void continueFromCustomerStep()}
            disabled={continueCustomerDisabled}
            className={`${btnPrimary} w-full min-h-12 touch-manipulation`}
          >
            {t("continueServices")}
          </button>
        </Card>
      )}

      {step === 2 && (
        <div
          className={cn(
            "min-w-0 space-y-2",
            cart.length === 0
              ? "max-lg:pb-[calc(3rem+env(safe-area-inset-bottom,0px))]"
              : "max-lg:pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))]"
          )}
        >
          {addedToast && (
            <div
              role="status"
              className="fixed left-1/2 top-[calc(3.5rem+env(safe-area-inset-top,0px)+0.75rem)] z-50 -translate-x-1/2 max-w-[min(100vw-2rem,20rem)] rounded-xl bg-[var(--text-primary)] px-4 py-2.5 text-sm font-medium text-[var(--surface)] shadow-lg animate-in fade-in"
            >
              {t("serviceAdded", { name: addedToast })}
            </div>
          )}
          {removedToast && (
            <div
              role="status"
              className="fixed left-1/2 top-[calc(3.5rem+env(safe-area-inset-top,0px)+0.75rem)] z-50 -translate-x-1/2 max-w-[min(100vw-2rem,20rem)] rounded-xl bg-[var(--text-primary)] px-4 py-2.5 text-sm font-medium text-[var(--surface)] shadow-lg animate-in fade-in"
            >
              {t("serviceRemoved", { name: removedToast })}
            </div>
          )}

          {!membership && customerId && (
            <div className="shrink-0">
              <WalkInMembershipSavingsBanner
                compact
                customerName={customerName}
                cart={cart}
                servicesById={servicesById}
                localeKit={localeKit}
              />
            </div>
          )}

          {staff.length === 0 && (
            <Callout variant="warning" title={t("noStaffConfigured")} className="shrink-0" />
          )}

          <div className="flex flex-col lg:flex-row lg:gap-4 lg:items-start min-w-0">
            <div className="flex flex-col min-w-0 lg:flex-1 lg:min-h-0 lg:min-h-[calc(100dvh-10rem)] lg:max-h-[calc(100dvh-10rem)]">
              <WalkInServiceCatalog
                serviceQuery={serviceQuery}
                onServiceQueryChange={setServiceQuery}
                recentServices={recentServices}
                favoriteServices={favoriteServices}
                favoriteServiceIds={favoriteServiceIds}
                topCategories={topCategories}
                catalogTop={catalogTop}
                onCatalogTopChange={handleCatalogTopChange}
                catalogSub={catalogSub}
                onCatalogSubChange={setCatalogSub}
                subCategoryGroups={subCategoryGroups}
                subCategories={subCategories}
                filteredServices={filteredServices}
                cartServiceIds={cart.map((c) => c.branchServiceId)}
                localeKit={localeKit}
                onToggleService={toggleService}
                onToggleFavorite={toggleFavorite}
              />
            </div>

            <div className="hidden lg:block w-full lg:w-[min(22rem,36%)] shrink-0 self-start">
              <WalkInCartPanel
                variant="panel"
                cart={cart}
                staff={staff}
                localeKit={localeKit}
                cartSubtotal={cartTotals.subtotal}
                estimatedCgst={cartTotals.estimatedCgst}
                estimatedSgst={cartTotals.estimatedSgst}
                estimatedGrand={cartTotals.estimatedGrand}
                gstEffective={gstEffective}
                cartHasFreshBill={cartHasFreshBill}
                billPreview={billPreview}
                saving={saving}
                stylistsRequired={stylistsRequired}
                stylistsComplete={stylistsComplete}
                onRemove={removeFromCart}
                onUpdateStaff={updateStaff}
                onApplyStylistToAll={applyStylistToAll}
                onEditPrice={setPriceEditIdx}
                onSaveOpen={() => void saveOpenVisit()}
                onProceedToBill={() => void proceedToBill()}
              />
            </div>
          </div>

          <div className="lg:hidden">
            {cartSheetOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40 bg-black/45"
                  aria-label={tCommon("close")}
                  onClick={() => setCartSheetOpen(false)}
                />
                <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[min(88dvh,640px)] flex-col rounded-t-2xl border-t border-[var(--border)] bg-[var(--surface)] shadow-2xl pb-[env(safe-area-inset-bottom,0px)]">
                  <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2.5 shrink-0">
                    <p className="font-bold text-sm text-[var(--text-primary)]">
                      {t("cartSheetTitle", { count: cart.length })}
                    </p>
                    <button
                      type="button"
                      onClick={() => setCartSheetOpen(false)}
                      className="p-2 rounded-lg hover:bg-[var(--surface-muted)] touch-manipulation"
                      aria-label={tCommon("close")}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="overflow-y-auto overscroll-contain touch-scroll-y px-3 py-3 min-h-0 flex-1" data-touch-scroll>
                    <WalkInCartPanel
                      variant="sheet"
                      cart={cart}
                      staff={staff}
                      localeKit={localeKit}
                      cartSubtotal={cartTotals.subtotal}
                      estimatedCgst={cartTotals.estimatedCgst}
                      estimatedSgst={cartTotals.estimatedSgst}
                      estimatedGrand={cartTotals.estimatedGrand}
                      gstEffective={gstEffective}
                      cartHasFreshBill={cartHasFreshBill}
                      billPreview={billPreview}
                      saving={saving}
                      stylistsRequired={stylistsRequired}
                      stylistsComplete={stylistsComplete}
                      onRemove={removeFromCart}
                      onUpdateStaff={updateStaff}
                      onApplyStylistToAll={applyStylistToAll}
                      onEditPrice={setPriceEditIdx}
                      onSaveOpen={() => void saveOpenVisit()}
                      onProceedToBill={() => void proceedToBill()}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md px-2.5 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(15,23,42,0.08)]">
              {cart.length === 0 ? (
                <p className="text-center text-xs text-[var(--text-tertiary)] py-0.5">{t("cartEmpty")}</p>
              ) : (
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setCartSheetOpen(true)}
                    className="flex w-full items-center gap-2 rounded-lg border border-[var(--border)]/80 bg-[var(--surface-muted)]/40 px-2.5 py-1 touch-manipulation"
                    aria-label={t("viewCart")}
                  >
                    <ShoppingBag className="w-4 h-4 shrink-0 text-[var(--brand-text)]" aria-hidden />
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-xs font-semibold text-[var(--text-primary)] tabular-nums truncate">
                        {t("mobileCartSummary", { count: cart.length, total: cartTotalDisplay })}
                      </p>
                      {stylistsRequired && !stylistsComplete ? (
                        <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 truncate">
                          {t("assignStylistsHint")}
                        </p>
                      ) : (
                        <p className="text-[10px] text-[var(--text-tertiary)] truncate">{t("viewCart")}</p>
                      )}
                    </div>
                    <ChevronUp className="w-4 h-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
                  </button>

                  {stylistsRequired && !stylistsComplete && (
                    <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 px-0.5 leading-tight">
                      {t("assignStylistError")}
                    </p>
                  )}

                  <WalkInMobileCartActions
                    saving={saving}
                    proceedDisabled={cart.length === 0 || saving || (stylistsRequired && !stylistsComplete)}
                    saveDisabled={cart.length === 0 || saving || staff.length === 0}
                    onProceed={() => void proceedToBill()}
                    onSave={() => void saveOpenVisit()}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {step === 3 && billPreview && (
        <div className="space-y-2 max-w-3xl xl:max-w-4xl mx-auto w-full min-w-0 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-6">
          {membership && (
            <div className="flex items-center gap-2 rounded-lg border border-violet-200/90 bg-violet-50/50 px-3 py-2 text-xs dark:border-violet-900/50 dark:bg-violet-950/25">
              <Sparkles className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" aria-hidden />
              <span className="font-semibold text-violet-900 dark:text-violet-200">
                {t("memberCardActiveTitle")} · {membership.planName || "Member"} ({membership.benefitPercent ?? 10}% off)
              </span>
            </div>
          )}

          {!billingLocked && !membership && customerId && (
            <div className="rounded-lg border border-violet-200/90 bg-violet-50/40 px-3 py-2 dark:border-violet-900/50 dark:bg-violet-950/20">
              <div className="mb-2 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-400" aria-hidden />
                <span className="text-[11px] font-bold uppercase tracking-wide text-violet-800 dark:text-violet-300">
                  {t("membershipBillRowLabel")}
                </span>
              </div>
              <WalkInMembershipPicker
                value={pendingMembershipPlanId}
                onChange={setPendingMembershipPlanId}
                disabled={!bookingId || saving}
              />
            </div>
          )}

          <Card className="p-3 sm:p-4 space-y-3">
            <div className="rounded-lg border border-[var(--border)]/80 bg-[var(--surface-muted)]/25 p-2">
              <div className="mb-1.5 flex items-center gap-1.5">
                <Scissors className="h-3.5 w-3.5 shrink-0 text-[var(--brand-text)]" aria-hidden />
                <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                  {t("servicesReview")}
                </span>
              </div>
              <ul className="space-y-0 divide-y divide-[var(--border)]/50">
                {(billPreview.lines && billPreview.lines.length > 0
                  ? billPreview.lines.map((line, idx) => {
                      const membershipFee = membershipFeeServiceLine(billPreview);
                      const isMembershipRow =
                        !!membershipFee &&
                        (idx >= cart.length ||
                          line.serviceName === membershipFee.name ||
                          /membership/i.test(line.serviceName));
                      const stylist =
                        !isMembershipRow && cart[idx]?.staffId
                          ? staff.find((s) => s.id === cart[idx].staffId)?.name
                          : undefined;
                      const qty = line.quantity || 1;
                      const linePrice = line.unitPrice * qty;
                      return (
                        <li
                          key={line.lineItemId || `${line.serviceName}-${idx}`}
                          className={cn(
                            "flex justify-between gap-2 items-start py-1.5 first:pt-0 last:pb-0",
                            isMembershipRow &&
                              "rounded-md border-l-2 border-violet-400 bg-violet-50/50 pl-2 dark:border-violet-600 dark:bg-violet-950/20"
                          )}
                        >
                          <div className="min-w-0 flex items-start gap-1.5">
                            {isMembershipRow ? (
                              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-400" aria-hidden />
                            ) : null}
                            <div className="min-w-0">
                              <p className="font-medium text-[var(--text-primary)] truncate text-sm">
                                {line.serviceName}
                                {qty > 1 ? ` × ${qty}` : ""}
                              </p>
                              {stylist && (
                                <p className="text-[11px] text-[var(--text-tertiary)]">{t("stylist", { name: stylist })}</p>
                              )}
                            </div>
                          </div>
                          {!isMembershipRow && !billingLocked ? (
                            <WalkInEditablePriceButton
                              amount={linePrice}
                              localeKit={localeKit}
                              size="md"
                              onEdit={() => setPriceEditIdx(idx)}
                            />
                          ) : (
                            <span className="font-semibold text-[var(--text-primary)] tabular-nums text-sm shrink-0">
                              {formatMoney(linePrice, localeKit)}
                            </span>
                          )}
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
                                className="flex justify-between gap-2 items-start py-1.5 first:pt-0"
                              >
                                <div className="min-w-0">
                                  <p className="font-medium text-sm text-[var(--text-primary)] truncate">{item.serviceName}</p>
                                  {stylist && (
                                    <p className="text-[11px] text-[var(--text-tertiary)]">{t("stylist", { name: stylist })}</p>
                                  )}
                                </div>
                                {!billingLocked ? (
                                  <WalkInEditablePriceButton
                                    amount={cartLinePrice(item)}
                                    localeKit={localeKit}
                                    size="md"
                                    onEdit={() => setPriceEditIdx(idx)}
                                  />
                                ) : (
                                  <span className="font-semibold text-sm text-[var(--text-primary)] tabular-nums shrink-0">
                                    {formatMoney(cartLinePrice(item), localeKit)}
                                  </span>
                                )}
                              </li>
                            );
                          })}
                          {fee && (
                            <li className="flex justify-between gap-3 items-start rounded-md border-l-2 border-violet-400 bg-violet-50/50 py-1.5 pl-2 dark:border-violet-600 dark:bg-violet-950/20">
                              <div className="min-w-0 flex items-center gap-1.5">
                                <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-400" aria-hidden />
                                <p className="font-medium text-sm text-[var(--text-primary)] truncate">{fee.name}</p>
                              </div>
                              <span className="font-semibold text-sm text-[var(--text-primary)] shrink-0 tabular-nums">
                                {formatMoney(fee.amount, localeKit)}
                              </span>
                            </li>
                          )}
                        </>
                      );
                    })())}
              </ul>
            </div>

            {!billingLocked && (
              <WalkInAppliedAdjustmentsBanner
                billPreview={billPreview}
                localeKit={localeKit}
                manualDiscountApplied={manualDiscountApplied}
                promoLocked={promoLocked}
                onEdit={() => setDiscountSheetOpen(true)}
              />
            )}

            {!billingLocked && !hasBillDiscount && (
              <button
                type="button"
                onClick={() => setDiscountSheetOpen(true)}
                className={cn(btnSecondary, "hidden lg:flex w-full min-h-11 items-center justify-center gap-2")}
              >
                <Tag className="h-4 w-4 shrink-0" aria-hidden />
                {t("applyManualDiscount")}
              </button>
            )}

            <div className="pt-2 border-t border-[var(--border)]">
              <BillBreakdownRows
                preview={billPreview}
                localeKit={localeKit}
                cgstDisplay={taxOverridden ? (Number.isFinite(cgstNum) ? cgstNum : 0) : undefined}
                sgstDisplay={taxOverridden ? (Number.isFinite(sgstNum) ? sgstNum : 0) : undefined}
                hideGrandTotal
                className="space-y-1.5 text-sm"
              />

              {!billingLocked && gstEffective && (
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
                    {taxOverridden && (
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

              <div className="hidden lg:flex justify-between font-bold text-base pt-2 border-t border-[var(--border)]">
                <span>{tCommon("grandTotal")}</span>
                <span className="text-[var(--brand-text)] tabular-nums">{formatMoney(displayGrandTotal, localeKit)}</span>
              </div>
              {branch?.gstin && (
                <p className="text-[10px] text-[var(--text-tertiary)] pt-1">{t("gstinLabel", { gstin: branch.gstin })}</p>
              )}
            </div>

          {!billingLocked && (
            <>
              <button
                type="button"
                onClick={() => goToStep(2)}
                className="text-sm font-semibold text-[var(--brand-text)] hover:underline touch-manipulation"
              >
                {t("addMoreServices")}
              </button>
              <div>
                <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5">
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

            {visitPassId && registrationCard && !paymentSuccess && (
              <details className="group rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]/30">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-semibold touch-manipulation">
                  <span>
                    {t("visitPassLabel")} · <span className="font-mono font-normal">{visitPassId}</span>
                  </span>
                  <ChevronDown className="w-4 h-4 shrink-0 transition group-open:rotate-180" />
                </summary>
                <div className="border-t border-[var(--border)] px-3 py-3 space-y-2">
                  <RegistrationCardPanel card={registrationCard} />
                  <p className="text-[11px] text-[var(--text-tertiary)]">{t("visitPassScreenshotHint")}</p>
                </div>
              </details>
            )}

          {paymentSuccess && paidInvoiceId && (
            <WalkInPaymentSuccess
              invoiceId={paidInvoiceId}
              shareBillMessage={t("shareBillMessage", { name: customerName || "Customer" })}
              customerName={customerName}
              reviewUrl={reviewInvitationUrl || undefined}
              reviewSubmittedRating={reviewSubmittedRating}
              registrationCard={registrationCard}
              processingLabel={tCommon("processing")}
              onError={setError}
              onDone={() => {
                setScreen("hub");
                setPaidInvoiceId("");
                setPaymentSuccess("");
                setReviewInvitationUrl("");
                setReviewSubmittedRating(null);
                setBookingId("");
                returnFromFlow();
              }}
              onViewHistory={() =>
                router.push(
                  urlCustomerId ? customerDetailPath("manager", urlCustomerId) : buildWalkInUrl({ tab: "history" })
                )
              }
            />
          )}

          {billingLocked && !paymentSuccess ? (
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
                onClick={() =>
                  router.push(
                    urlCustomerId ? customerDetailPath("manager", urlCustomerId) : buildWalkInUrl({ tab: "history" })
                  )
                }
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
                  returnFromFlow();
                }}
                className={`${btnSecondary} w-full min-h-11`}
              >
                {t("done")}
              </button>
            </div>
          ) : !paymentSuccess ? (
            <>
              <div className="hidden lg:block">
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
          ) : null}
        </Card>

          {!billingLocked && (
            <div className="lg:hidden">
              <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md px-2.5 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(15,23,42,0.08)]">
                <WalkInMobilePaymentActions
                  saving={payBooking.isPending}
                  payDisabled={
                    !taxValid ||
                    payBooking.isPending ||
                    applyPromo.isPending ||
                    applyBillDiscount.isPending ||
                    (paymentMode === "SPLIT" && !splitValid)
                  }
                  discountSavings={discountSavings}
                  hasBillDiscount={hasBillDiscount}
                  grandTotalDisplay={formatMoney(displayGrandTotal, localeKit)}
                  discountDisplay={`−${formatMoney(discountSavings, localeKit)}`}
                  onDiscount={() => setDiscountSheetOpen(true)}
                  onPay={submitPayment}
                />
              </div>
              <div className="h-[calc(4.25rem+env(safe-area-inset-bottom))]" aria-hidden />
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

      <WalkInServicePriceSheet
        open={priceEditIdx != null}
        item={priceEditIdx != null ? cart[priceEditIdx] ?? null : null}
        saving={savingPrice}
        onClose={() => setPriceEditIdx(null)}
        onSave={(finalPrice) => {
          if (priceEditIdx == null) return;
          void applyLinePrice(priceEditIdx, finalPrice);
        }}
      />

      <WalkInDiscountSheet
        open={discountSheetOpen}
        onClose={closeDiscountSheet}
        applySuccess={discountApplySuccess}
        successAmount={(billPreview?.manualDiscountAmount ?? 0) + (billPreview?.promoDiscountAmount ?? 0)}
        coupons={coupons}
        offers={offers}
        localeKit={localeKit}
        selectedCouponId={selectedCouponId}
        selectedOfferId={selectedOfferId}
        billDiscountType={billDiscountType}
        billDiscountValue={billDiscountValue}
        promoLocked={promoLocked}
        manualDiscountApplied={manualDiscountApplied}
        manualDiscountAmount={billPreview?.manualDiscountAmount}
        manualDiscountLabel={billPreview?.manualDiscountLabel}
        disabled={billingLocked}
        applyPending={applyBillDiscount.isPending}
        onCouponChange={onCouponChange}
        onOfferChange={onOfferChange}
        onBillDiscountTypeChange={setBillDiscountType}
        onBillDiscountValueChange={setBillDiscountValue}
        onClearManualDiscount={clearManualDiscount}
      />
    </div>
  );
}
