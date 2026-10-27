"use client";

import React, { useEffect, useState } from "react";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { useOwner } from "@/context/OwnerContext";
import { getErrorMessage } from "@/lib/reservationUi";
import { ownerService } from "@/services/ownerService";
import type { CenterSettings } from "@/types/owner";

const input =
  "h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm outline-none";

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between p-3.5 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)]"
      role="switch"
      aria-checked={checked}
    >
      <span className="text-xs font-bold">{label}</span>
      <span className={`w-11 h-6 rounded-full p-0.5 transition-colors ${checked ? "bg-[var(--primary)]" : "bg-[var(--foreground)]"}`}>
        <span className={`block w-5 h-5 rounded-full bg-[#101014] transition-transform ${checked ? "-translate-x-5" : "translate-x-0"}`} />
      </span>
    </button>
  );
}

export default function OwnerEditPage() {
  const { centerId, center } = useOwner();
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [allowOnline, setAllowOnline] = useState(false);
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [preventOverlaps, setPreventOverlaps] = useState(true);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    let active = true;
    Promise.allSettled([ownerService.getSettings(centerId), ownerService.getSiteSettings(centerId)]).then(([s, site]) => {
      if (!active) return;
      if (s.status === "fulfilled") {
        setAllowOnline(!!s.value.allowOnlineBooking);
        setAutoConfirm(!!s.value.onlineBookingAutoConfirm);
        setPreventOverlaps(s.value.preventOverlaps !== false);
      } else setMsg({ ok: false, text: getErrorMessage(s.reason) });
      if (site.status === "fulfilled") {
        setSeoTitle(site.value.defaultSeoTitle ?? "");
        setSeoDesc(site.value.defaultSeoDescription ?? "");
        setLogoUrl(site.value.logoUrl ?? "");
      }
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [centerId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setMsg(null);
    try {
      const settings: CenterSettings = {
        allowOnlineBooking: allowOnline,
        onlineBookingAutoConfirm: autoConfirm,
        preventOverlaps,
      };
      await ownerService.updateSettings(centerId, settings);
      await ownerService.updateSiteSettings(centerId, {
        defaultSeoTitle: seoTitle,
        defaultSeoDescription: seoDesc,
        logoUrl,
      });
      setMsg({ ok: true, text: "تغییرات ذخیره شد." });
    } catch (err) {
      setMsg({ ok: false, text: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-10">
      <OwnerPageHeader title="ویرایش گیمنت" />

      <main className="flex-1 mt-16 px-4 py-4 lg:max-w-[640px] lg:mx-auto lg:w-full lg:px-0">
        {!loaded ? (
          <div className="h-40 rounded-card bg-[var(--bg-card)] animate-pulse" />
        ) : (
          <form onSubmit={save} className="flex flex-col gap-4">
            <p className="text-xs text-[var(--text-muted)]">گیمنت: {center?.name ?? centerId}</p>

            {msg && (
              <div
                className={`p-3 rounded-card text-xs font-bold ${
                  msg.ok
                    ? "bg-[var(--accent-green)]/15 text-[var(--accent-green)]"
                    : "bg-[var(--accent-red)]/10 text-[var(--accent-red)]"
                }`}
              >
                {msg.text}
              </div>
            )}

            <h2 className="text-sm font-extrabold">رزرو آنلاین</h2>
            <Toggle label="فعال بودن رزرو آنلاین" checked={allowOnline} onChange={setAllowOnline} />
            <Toggle label="تایید خودکار رزروهای آنلاین" checked={autoConfirm} onChange={setAutoConfirm} />
            <Toggle label="جلوگیری از تداخل رزروها" checked={preventOverlaps} onChange={setPreventOverlaps} />

            <h2 className="text-sm font-extrabold mt-2">اطلاعات سایت</h2>
            <input className={input} dir="ltr" placeholder="آدرس لوگو (URL)" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
            <input className={input} placeholder="عنوان سئو" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
            <textarea
              rows={3}
              placeholder="توضیحات سئو"
              value={seoDesc}
              onChange={(e) => setSeoDesc(e.target.value)}
              className="rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] p-3 text-sm outline-none resize-none"
            />

            <button type="submit" disabled={saving} className="h-12 rounded-card bg-[var(--primary)] text-[#101014] font-black text-sm disabled:opacity-60">
              {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}