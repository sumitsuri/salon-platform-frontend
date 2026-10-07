"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Camera, FileUp, User } from "lucide-react";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/auth-session";
import { PageHeader, Card, inputClass, btnPrimary, btnSecondary, AlertBanner } from "@/components/ui";
import { StaffPageShell } from "@/components/staff/StaffPageShell";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function StaffProfilePage() {
  const t = useTranslations("staff.profile");
  const queryClient = useQueryClient();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["staff-portal-profile"],
    queryFn: () => api.getStaffPortalProfile(),
  });

  useEffect(() => {
    if (!profile) return;
    setPhone(profile.phone ?? "");
    setDesignation(profile.designation ?? "");
  }, [profile]);

  useEffect(() => {
    if (!profile?.hasProfilePhoto) {
      setPhotoUrl(null);
      return;
    }
    const token = getStoredUser()?.accessToken;
    if (!token) return;
    let objectUrl: string | null = null;
    fetch(`${API_BASE}/api/v1/staff-portal/me/profile-photo`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setPhotoUrl(objectUrl);
        }
      });
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [profile?.hasProfilePhoto]);

  const saveProfile = useMutation({
    mutationFn: () => api.updateStaffPortalProfile({ phone, designation }),
    onSuccess: () => {
      setMsg(t("saved"));
      queryClient.invalidateQueries({ queryKey: ["staff-portal-profile"] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : t("saveFailed")),
  });

  const uploadPhoto = useMutation({
    mutationFn: (file: File) => api.uploadStaffProfilePhoto(file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff-portal-profile"] }),
  });

  const uploadDoc = useMutation({
    mutationFn: (file: File) => api.uploadStaffAadhar(file),
    onSuccess: () => {
      setMsg(t("docUploaded"));
      queryClient.invalidateQueries({ queryKey: ["staff-portal-profile"] });
    },
  });

  return (
    <StaffPageShell>
      <PageHeader title={t("title")} subtitle={profile?.email} />

      <div className="grid gap-3 md:gap-4 lg:grid-cols-2 min-w-0">
      <Card className="flex gap-4 p-4 lg:col-span-2">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-[var(--accent)]/15">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[var(--accent)]">
              <User className="h-10 w-10" />
            </div>
          )}
          <button
            type="button"
            className="absolute bottom-0 right-0 rounded-full bg-[var(--surface)] p-1.5 shadow border border-[var(--border)]"
            onClick={() => photoInputRef.current?.click()}
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadPhoto.mutate(f);
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold text-[var(--text-primary)]">{profile?.name}</p>
          <p className="text-sm text-[var(--text-secondary)]">{profile?.branchName}</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">{profile?.role?.replace("_", " ")}</p>
        </div>
      </Card>

      {(msg || error) && (
        <AlertBanner variant={error ? "error" : "success"}>{error || msg}</AlertBanner>
      )}

      <Card className="space-y-3 p-4">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{t("personalInfo")}</p>
        <label className="text-xs font-semibold text-[var(--text-secondary)]">
          {t("phone")}
          <input className={`${inputClass} mt-1`} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-[var(--text-secondary)]">
          {t("designation")}
          <input className={`${inputClass} mt-1`} value={designation} onChange={(e) => setDesignation(e.target.value)} />
        </label>
        <button
          type="button"
          className={btnPrimary}
          disabled={saveProfile.isPending}
          onClick={() => {
            setError("");
            setMsg("");
            saveProfile.mutate();
          }}
        >
          {saveProfile.isPending ? t("saving") : t("save")}
        </button>
      </Card>

      <Card className="space-y-3 p-4">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{t("documentCenter")}</p>
        <p className="text-xs text-[var(--text-secondary)]">
          {profile?.hasAadharDocument ? t("aadharOnFile") : t("aadharMissing")}
        </p>
        {profile?.idProofReference && (
          <p className="text-xs text-[var(--text-tertiary)]">{profile.idProofReference}</p>
        )}
        <button type="button" className={btnSecondary} onClick={() => docInputRef.current?.click()}>
          <FileUp className="h-4 w-4" />
          {t("uploadAadhar")}
        </button>
        <input
          ref={docInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadDoc.mutate(f);
          }}
        />
      </Card>
      </div>
    </StaffPageShell>
  );
}
