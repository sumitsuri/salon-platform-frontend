"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { LayoutDashboard, ClipboardList, Building2, Sparkles, Scissors, Users, Contact, IndianRupee, Package, UserPlus, Megaphone, TrendingUp, BadgePercent, Gift, ScanSearch, MessageSquareHeart, MessageCircle, Briefcase, ClipboardCheck, Wand2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore, useAuthHydrated } from "@/lib/auth-store";
import { resolveAccentColor, useThemeStore } from "@/lib/theme-store";
import { EnterpriseAppShell } from "@/components/EnterpriseAppShell";
import {
  isNavActive,
  AppNavSection,
  MOBILE_MAIN_PADDING_BOTTOM_TABS,
  type MobileBottomNavConfig,
} from "@/components/app-nav";
import { AntrahqLoading } from "@/components/brand/AntrahqLoading";
import { resolveUnauthenticatedLoginPath } from "@/lib/app-hosts";
import { ProductTelemetryTracker } from "@/components/ProductTelemetryTracker";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("admin.layout");
  const tCommon = useTranslations("common");
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthHydrated();
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const themeSettings = useThemeStore();

  const { data: tenant } = useQuery({
    queryKey: ["tenant"],
    queryFn: () => api.getTenant(),
    enabled: hydrated && !!user,
    staleTime: 300_000,
  });

  const localSpotlightLicensed =
    user?.role === "PLATFORM_SUPER_ADMIN" || tenant?.localSpotlightEnabled === true;
  const guestReviewsLicensed =
    user?.role === "PLATFORM_SUPER_ADMIN" || tenant?.guestReviewsEnabled === true;

  const nav = useMemo((): AppNavSection[] => {
    const intelligenceItems = [
      { href: "/admin/market-pulse", label: t("nav.marketPulse"), shortLabel: t("nav.pulse"), icon: TrendingUp },
      ...(localSpotlightLicensed
        ? [{ href: "/admin/local-spotlight", label: t("nav.localSpotlight"), shortLabel: t("nav.spotlight"), icon: ScanSearch }]
        : []),
      { href: "/admin/insights", label: t("nav.insights"), shortLabel: t("nav.tips"), icon: Sparkles },
      ...(guestReviewsLicensed
        ? [{ href: "/admin/guest-voice", label: t("nav.guestVoice"), shortLabel: t("nav.voice"), icon: MessageSquareHeart }]
        : []),
    ];
    return [
      {
        id: "command",
        items: [
          { href: "/admin", label: t("nav.overview"), shortLabel: t("nav.home"), icon: LayoutDashboard, exact: true },
        ],
      },
      {
        id: "intelligence",
        label: t("nav.sectionIntelligence"),
        items: intelligenceItems,
      },
      {
        id: "operations",
        label: t("nav.sectionOperations"),
        items: [
          { href: "/admin/bookings", label: t("nav.bookings"), shortLabel: t("nav.book"), icon: ClipboardList },
          { href: "/admin/customers", label: t("nav.customers"), shortLabel: t("nav.customersShort"), icon: Contact },
          { href: "/admin/services", label: t("nav.services"), shortLabel: t("nav.sales"), icon: Scissors },
          { href: "/admin/inventory", label: t("nav.inventory"), shortLabel: t("nav.stock"), icon: Package },
          { href: "/admin/employees", label: t("nav.employees"), shortLabel: t("nav.staff"), icon: Users },
          { href: "/admin/requests", label: t("nav.requests"), shortLabel: t("nav.requestsShort"), icon: ClipboardCheck },
        ],
      },
      {
        id: "growth",
        label: t("nav.sectionGrowth"),
        items: [
          { href: "/admin/leads", label: t("nav.leads"), shortLabel: t("nav.leads"), icon: UserPlus },
          { href: "/admin/campaigns", label: t("nav.campaigns"), shortLabel: t("nav.promo"), icon: Megaphone },
          { href: "/admin/whatsapp-templates", label: t("nav.whatsappTemplates"), shortLabel: t("nav.wa"), icon: MessageCircle },
          { href: "/admin/promotions", label: t("nav.promotions"), shortLabel: t("nav.deals"), icon: BadgePercent },
          { href: "/admin/offers", label: t("nav.offerStudio"), shortLabel: t("nav.offerStudioShort"), icon: Wand2 },
          { href: "/admin/scratch-cards", label: t("nav.scratchCards"), shortLabel: t("nav.scratch"), icon: Gift },
        ],
      },
      {
        id: "business",
        label: t("nav.sectionBusiness"),
        items: [
          { href: "/admin/finance", label: t("nav.finance"), shortLabel: t("nav.pl"), icon: IndianRupee },
          { href: "/admin/branches", label: t("nav.organization"), shortLabel: t("nav.org"), icon: Building2 },
        ],
      },
    ];
  }, [t, localSpotlightLicensed, guestReviewsLicensed]);

  const mobileBottomNav = useMemo((): MobileBottomNavConfig => {
    const intelligenceLinks = [
      {
        href: "/admin/market-pulse",
        label: t("nav.marketPulse"),
        icon: TrendingUp,
        description: t("nav.morePulseHint"),
      },
      ...(localSpotlightLicensed
        ? [{
            href: "/admin/local-spotlight",
            label: t("nav.localSpotlight"),
            icon: ScanSearch,
            description: t("nav.moreSpotlightHint"),
          }]
        : []),
      {
        href: "/admin/insights",
        label: t("nav.insights"),
        icon: Sparkles,
        description: t("nav.moreInsightsHint"),
      },
      ...(guestReviewsLicensed
        ? [{
            href: "/admin/guest-voice",
            label: t("nav.guestVoice"),
            icon: MessageSquareHeart,
            description: t("nav.moreGuestVoiceHint"),
          }]
        : []),
    ];
    return {
      moreTabLabel: t("nav.tabMore"),
      menuTitle: t("nav.moreMenuTitle"),
      moreActivePrefixes: [
        "/admin/market-pulse",
        "/admin/local-spotlight",
        "/admin/insights",
        "/admin/guest-voice",
        "/admin/leads",
        "/admin/campaigns",
        "/admin/whatsapp-templates",
        "/admin/promotions",
        "/admin/offers",
        "/admin/scratch-cards",
      ],
      tabs: [
        { id: "home", href: "/admin", label: t("nav.tabHome"), icon: LayoutDashboard, exact: true },
        {
          id: "ops",
          href: "/admin/ops",
          label: t("nav.tabOps"),
          icon: Briefcase,
          activePrefixes: [
            "/admin/ops",
            "/admin/bookings",
            "/admin/customers",
            "/admin/services",
            "/admin/inventory",
            "/admin/employees",
            "/admin/requests",
          ],
        },
        { id: "finance", href: "/admin/finance", label: t("nav.tabFinance"), icon: IndianRupee },
        { id: "org", href: "/admin/branches", label: t("nav.tabOrg"), icon: Building2 },
      ],
      moreSections: [
        {
          id: "intelligence",
          label: t("nav.sectionIntelligence"),
          links: intelligenceLinks,
        },
        {
          id: "growth",
          label: t("nav.sectionGrowth"),
          links: [
            {
              href: "/admin/leads",
              label: t("nav.leads"),
              icon: UserPlus,
              description: t("nav.moreLeadsHint"),
            },
            {
              href: "/admin/campaigns",
              label: t("nav.campaigns"),
              icon: Megaphone,
              description: t("nav.moreCampaignsHint"),
            },
            {
              href: "/admin/whatsapp-templates",
              label: t("nav.whatsappTemplates"),
              icon: MessageCircle,
              description: t("nav.moreWhatsAppHint"),
            },
            {
              href: "/admin/promotions",
              label: t("nav.promotions"),
              icon: BadgePercent,
              description: t("nav.morePromotionsHint"),
            },
            {
              href: "/admin/offers",
              label: t("nav.offerStudio"),
              icon: Wand2,
              description: t("nav.moreOfferStudioHint"),
            },
            {
              href: "/admin/scratch-cards",
              label: t("nav.scratchCards"),
              icon: Gift,
              description: t("nav.moreScratchHint"),
            },
          ],
        },
      ],
    };
  }, [t, localSpotlightLicensed, guestReviewsLicensed]);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace(resolveUnauthenticatedLoginPath());
    else if (user.role !== "BRAND_ADMIN" && user.role !== "PLATFORM_SUPER_ADMIN") router.replace("/manager");
  }, [user, router, hydrated]);

  if (!hydrated) {
    return <AntrahqLoading label={tCommon("loading")} />;
  }

  if (!user || (user.role !== "BRAND_ADMIN" && user.role !== "PLATFORM_SUPER_ADMIN")) return null;

  const isActive = (href: string, exact?: boolean) => isNavActive(pathname, href, exact);

  const brandColor = resolveAccentColor(themeSettings, user.primaryColor);

  return (
    <EnterpriseAppShell
      homeHref="/admin"
      homeLabel={t("nav.overview")}
      brandName={user.tenantName || "Admin"}
      brandSubtitle={`${t("ceo")} · ${user.name}`}
      brandLetter={(user.tenantName || "A")[0]}
      brandColor={brandColor}
      nav={nav}
      isActive={isActive}
      settingsOpen={settingsOpen}
      onSettingsOpen={setSettingsOpen}
      onLogout={() => {
        logout();
        router.push("/login");
      }}
      logoutLabel={tCommon("logout")}
      mobileMainPadding={MOBILE_MAIN_PADDING_BOTTOM_TABS}
      mobileNavFabColor={brandColor}
      mobileBottomNav={mobileBottomNav}
    >
      <ProductTelemetryTracker portal="admin" active />
      {children}
    </EnterpriseAppShell>
  );
}
