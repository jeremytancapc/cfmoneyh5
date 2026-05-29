"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Phone } from "@phosphor-icons/react";
import { trackEvent } from "@/lib/analytics";

const LOG = "[aip:client]";

const SG_MOBILE_RE = /^[89]\d{7}$/;

export function AipMobileForm() {
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    trackEvent("aip_step1_viewed");
  }, []);

  const digits = mobile.replace(/\D/g, "");
  const isValid = SG_MOBILE_RE.test(digits);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || loading) return;

    setError(null);
    setLoading(true);

    console.info(`${LOG} POST /api/aip/verify`);

    try {
      const res = await fetch("/api/aip/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mobile: digits }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      console.info(`${LOG} verified — navigating to /aip/book`);
      trackEvent("aip_step1_mobile_submitted");
      router.push("/aip/book");
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="animate-fade-up flex flex-col gap-8 pt-6 sm:pt-0">
      <div className="flex flex-col gap-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
          Pre-approved offer
        </span>
        <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
          Book your appointment
        </h2>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          Please enter the mobile number that has been pre-approved. We&apos;ll use this to confirm your booking.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="aip-mobile" className="text-sm font-semibold text-[var(--text-primary)]">
          Mobile number
        </label>

        <div
          className="flex items-center gap-0 overflow-hidden rounded-[var(--radius-md)] border transition-all duration-200"
          style={{
            borderColor: error ? "var(--color-red-500)" : "var(--border-default)",
            boxShadow: error ? "0 0 0 3px color-mix(in srgb, var(--color-red-500) 12%, transparent)" : undefined,
          }}
        >
          <div className="flex shrink-0 items-center gap-2 border-r border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3.5 py-3.5 text-sm font-medium text-[var(--text-secondary)]">
            <Phone size={15} weight="duotone" className="shrink-0 text-[var(--text-tertiary)]" />
            <span>+65</span>
          </div>
          <input
            id="aip-mobile"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={8}
            placeholder="8123 4567"
            value={mobile}
            onChange={(e) => {
              setError(null);
              setMobile(e.target.value.replace(/[^\d\s]/g, ""));
            }}
            className="min-w-0 flex-1 bg-[var(--surface-primary)] px-4 py-3.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
          />
        </div>

        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={!isValid || loading}
        className="flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-blue px-6 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <>
            Continue
            <ArrowRight size={16} weight="bold" />
          </>
        )}
      </button>

      <p className="text-xs leading-relaxed text-[var(--text-tertiary)]">
        Only phone numbers that have received a pre-approved offer from CF Money are eligible to use this link.
      </p>
    </form>
  );
}
