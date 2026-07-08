"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Scissors } from "lucide-react";
import { useAuthStore, useAuthHydrated, getHomeForRole } from "@/lib/auth-store";
import { AlertBanner, btnPrimary, inputClass } from "@/components/ui";
import { SettingsButton, SettingsSheet } from "@/components/SettingsSheet";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const login = useAuthStore((s) => s.login);
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthHydrated();
  const router = useRouter();

  useEffect(() => {
    setSessionExpired(new URLSearchParams(window.location.search).get("expired") === "1");
  }, []);

  useEffect(() => {
    if (!hydrated || !user) return;
    router.replace(getHomeForRole(user.role));
  }, [hydrated, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      const user = useAuthStore.getState().user;
      router.push(getHomeForRole(user?.role || "SALON_MANAGER"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface-muted)]">
      <div className="absolute top-4 right-4">
        <SettingsButton onClick={() => setSettingsOpen(true)} />
      </div>
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div
              className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-[var(--brand-on-brand)] shadow-lg hero-banner"
            >
              <Scissors className="w-7 h-7" />
            </div>
            <h1 className="mt-5 text-2xl font-bold text-[var(--text-primary)] tracking-tight">Salon Platform</h1>
            <p className="text-[var(--text-secondary)] text-sm mt-1">Manage your salon from anywhere</p>
          </div>

          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className={inputClass}
                />
              </div>
              {sessionExpired && (
                <AlertBanner variant="warning">Your session expired. Please sign in again.</AlertBanner>
              )}
              {error && <AlertBanner variant="error">{error}</AlertBanner>}
              <button type="submit" disabled={loading} className={`${btnPrimary} w-full`}>
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>

          <details className="mt-4 bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 text-xs text-[var(--text-secondary)]">
            <summary className="font-semibold text-[var(--text-primary)] cursor-pointer">Demo accounts</summary>
            <div className="mt-2 space-y-1">
              <p>CEO: ceo@demo-brand.local / ceo123</p>
              <p>Manager: manager.lithos@demo-brand.local / manager123</p>
              <p>Platform: platform@salonplatform.local / admin123</p>
            </div>
          </details>
        </div>
      </div>
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
