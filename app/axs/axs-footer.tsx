"use client";

import { useState, useEffect } from "react";
import { X } from "@phosphor-icons/react";
import { TermsContent, PrivacyContent } from "./legal-content";

type DocKey = "terms" | "privacy";

const LABELS: Record<DocKey, string> = {
  terms:   "Terms & Conditions",
  privacy: "Privacy Policy",
};

function DocModal({ doc, onClose }: { doc: DocKey; onClose: () => void }) {
  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{
        background: "oklch(0.18 0.02 260 / 0.55)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      {/* Modal panel */}
      <div
        className="relative flex flex-col w-full max-w-lg rounded-2xl overflow-hidden"
        style={{
          height: "min(80dvh, 640px)",
          background: "var(--surface-elevated)",
          boxShadow: "0 24px 60px oklch(0.18 0.02 260 / 0.40)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex shrink-0 items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {LABELS[doc]}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-[var(--surface-secondary)] active:scale-95"
          >
            <X size={16} weight="bold" style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {doc === "terms"   && <TermsContent />}
          {doc === "privacy" && <PrivacyContent />}
        </div>
      </div>
    </div>
  );
}

export function AxsFooter() {
  const [open, setOpen] = useState<DocKey | null>(null);

  return (
    <>
      <footer className="border-t border-[var(--border-subtle)] px-6 py-6">
        <div className="mx-auto max-w-[480px] flex flex-col gap-2">
          <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
            CF Money Pte. Ltd. (UEN No. 201406595W) is licensed by the Ministry of Law as a Licensed Moneylender (Licence No. 86/2026).
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-tertiary)]">
            <button
              type="button"
              onClick={() => setOpen("terms")}
              className="underline underline-offset-2 hover:text-[var(--text-secondary)] transition-colors"
            >
              Terms &amp; Conditions
            </button>
            <button
              type="button"
              onClick={() => setOpen("privacy")}
              className="underline underline-offset-2 hover:text-[var(--text-secondary)] transition-colors"
            >
              Privacy Policy
            </button>
            <span>© 2026 CF Money Pte. Ltd.</span>
          </div>
        </div>
      </footer>

      {open && <DocModal doc={open} onClose={() => setOpen(null)} />}
    </>
  );
}
