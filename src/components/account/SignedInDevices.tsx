"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Monitor, ShieldCheck, Smartphone, Tablet } from "lucide-react";
import { api, type SignedInDevice } from "@/lib/api";
import { cn } from "@/lib/utils";
import { btnSecondary } from "@/components/ui";

const DEVICES_KEY = ["account", "signed-in-devices"] as const;

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

function relativeTime(iso: string | null | undefined, locale: string, justNow: string): string {
  if (!iso) return "";
  const diff = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(diff)) return "";
  if (Math.abs(diff) < 60_000) return justNow;
  const fmt = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(diff) >= ms) return fmt.format(Math.round(diff / ms), unit);
  }
  return justNow;
}

function DeviceIcon({ type }: { type?: SignedInDevice["deviceType"] }) {
  const cls = "w-4 h-4 text-[var(--text-primary)]";
  if (type === "MOBILE") return <Smartphone className={cls} />;
  if (type === "TABLET") return <Tablet className={cls} />;
  return <Monitor className={cls} />;
}

/**
 * Every device this account is signed in on, with where it signed in from. Sessions never time out, so this is
 * how someone ends one they no longer control (a lost phone, a shared tablet).
 */
export function SignedInDevices() {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmOthers, setConfirmOthers] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const devices = useQuery({
    queryKey: DEVICES_KEY,
    queryFn: () => api.listSignedInDevices(),
    enabled: open,
    staleTime: 0,
  });

  const revoke = useMutation({
    mutationFn: (id: string) => api.revokeSignedInDevice(id),
    onSuccess: () => {
      setConfirmId(null);
      setError("");
      setNotice(t("deviceSignedOut"));
      void queryClient.invalidateQueries({ queryKey: DEVICES_KEY });
    },
    onError: (e) => setError(e instanceof Error ? e.message : t("devicesError")),
  });

  const revokeOthers = useMutation({
    mutationFn: () => api.revokeOtherSignedInDevices(),
    onSuccess: () => {
      setConfirmOthers(false);
      setError("");
      setNotice(t("othersSignedOut"));
      void queryClient.invalidateQueries({ queryKey: DEVICES_KEY });
    },
    onError: (e) => setError(e instanceof Error ? e.message : t("devicesError")),
  });

  const rows = devices.data ?? [];
  const others = rows.filter((d) => !d.current);
  const portalLabel = (portal?: string | null) => {
    if (portal === "employee") return t("portalEmployee");
    if (portal === "manager") return t("portalManager");
    if (portal === "admin") return t("portalAdmin");
    return "";
  };

  return (
    <section className="space-y-3" data-testid="signed-in-devices">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 text-left touch-manipulation"
      >
        <span className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-[var(--surface-muted)] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-[var(--text-primary)]" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-[var(--text-primary)]">{t("devicesTitle")}</span>
            <span className="block text-xs text-[var(--text-secondary)]">{t("devicesHint")}</span>
          </span>
        </span>
        <ChevronDown
          className={cn("w-4 h-4 text-[var(--text-secondary)] shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="space-y-3 pl-1">
          {devices.isLoading && <p className="text-xs text-[var(--text-secondary)]">{t("devicesLoading")}</p>}

          {devices.isError && (
            <div className="space-y-2">
              <p className="text-xs text-red-600">{t("devicesError")}</p>
              <button type="button" className={`${btnSecondary} text-xs`} onClick={() => void devices.refetch()}>
                {t("devicesRetry")}
              </button>
            </div>
          )}

          {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
          {notice && !error && <p className="text-xs text-emerald-700" role="status">{notice}</p>}

          <ul className="space-y-2">
            {rows.map((d) => {
              const where = d.lastLocation || d.loginLocation || t("locationUnknown");
              const ip = d.lastIp || d.loginIp;
              const portal = portalLabel(d.portal);
              return (
                <li
                  key={d.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 flex gap-3"
                  data-testid="signed-in-device"
                >
                  <span className="w-9 h-9 rounded-xl bg-[var(--surface-muted)] flex items-center justify-center shrink-0">
                    <DeviceIcon type={d.deviceType} />
                  </span>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-sm font-semibold text-[var(--text-primary)] break-words">
                      {d.deviceLabel}
                      {d.current && (
                        <span className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 bg-[var(--brand-light)] text-[var(--brand-text)]">
                          {t("thisDevice")}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] break-words">
                      {where}
                      {ip ? ` · ${ip}` : ""}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {d.current ? t("activeNow") : t("lastActive", { time: relativeTime(d.lastActiveAt, locale, t("justNow")) })}
                      {portal ? ` · ${portal}` : ""}
                    </p>
                    {d.signedInAt && (
                      <p className="text-[11px] text-[var(--text-tertiary,var(--text-secondary))]">
                        {t("signedInOn", {
                          date: new Date(d.signedInAt).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }),
                        })}
                      </p>
                    )}
                    {!d.current && (
                      <div className="pt-1.5 flex items-center gap-2">
                        {confirmId === d.id ? (
                          <>
                            <button
                              type="button"
                              disabled={revoke.isPending}
                              onClick={() => revoke.mutate(d.id)}
                              className="text-xs font-semibold rounded-lg px-3 py-1.5 bg-red-600 text-white disabled:opacity-60 touch-manipulation"
                            >
                              {revoke.isPending ? tCommon("processing") : t("confirmSignOut")}
                            </button>
                            <button type="button" onClick={() => setConfirmId(null)} className="text-xs text-[var(--text-secondary)] px-2 py-1.5">
                              {tCommon("cancel")}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmId(d.id);
                              setNotice("");
                            }}
                            className="text-xs font-semibold text-red-600 hover:underline touch-manipulation py-1"
                          >
                            {t("signOutDevice")}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {devices.isSuccess && others.length === 0 && (
            <p className="text-xs text-[var(--text-secondary)]">{t("noOtherDevices")}</p>
          )}

          {others.length > 0 &&
            (confirmOthers ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={revokeOthers.isPending}
                  onClick={() => revokeOthers.mutate()}
                  className="text-xs font-semibold rounded-lg px-3 py-2 bg-red-600 text-white disabled:opacity-60 touch-manipulation"
                >
                  {revokeOthers.isPending ? tCommon("processing") : t("signOutOthersConfirm", { count: others.length })}
                </button>
                <button type="button" onClick={() => setConfirmOthers(false)} className="text-xs text-[var(--text-secondary)] px-2 py-2">
                  {tCommon("cancel")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={`${btnSecondary} text-xs w-full touch-manipulation`}
                onClick={() => {
                  setConfirmOthers(true);
                  setNotice("");
                }}
              >
                {t("signOutOthers")}
              </button>
            ))}

          <p className="text-[11px] text-[var(--text-secondary)]">{t("locationNote")}</p>
        </div>
      )}
    </section>
  );
}
