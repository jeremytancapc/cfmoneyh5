"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  DeviceMobile,
  LockKey,
  ArrowRight,
  ShieldCheck,
  Warning,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { usePortal } from "./portal-context";

export function LoginScreen() {
  const { loginWithSingpass, loginWithOtp } = usePortal();

  const [showOtp, setShowOtp] = useState(false);
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [singpassLoading, setSingpassLoading] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  function handleSendOtp() {
    if (phone.replace(/\s/g, "").length < 8) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setOtpSent(true);
    }, 1200);
  }

  function handleOtpChange(idx: number, val: string) {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    setOtpError(false);
    if (val && idx < 5) {
      otpRefs.current[idx + 1]?.focus();
    }
  }

  function handleOtpKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  }

  function handleOtpVerify() {
    const code = otp.join("");
    if (code.length < 6) {
      setOtpError(true);
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      loginWithOtp();
    }, 1000);
  }

  function handleSingpass() {
    setSingpassLoading(true);
    setTimeout(() => {
      setSingpassLoading(false);
      loginWithSingpass();
    }, 1400);
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--surface-primary)]">
      {/* Header */}
      <div className="bg-brand-blue px-6 pt-12 pb-10 text-center">
        <div className="flex justify-center mb-3">
          <Image
            src="/images/cf-money-white.png"
            alt="CF Money"
            width={140}
            height={42}
            className="h-7 w-auto"
            priority
          />
        </div>
        <p className="text-[var(--text-on-brand)] opacity-75 text-sm mt-2">
          Customer Portal
        </p>
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col items-center px-5 py-8 sm:px-8">
        <div className="w-full max-w-[420px]">
          <div
            className="rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] p-6 sm:p-8 shadow-sm animate-fade-up"
          >
            <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-1">
              Sign in
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mb-7">
              Access your loan account securely
            </p>

            {/* SingPass Button */}
            <button
              onClick={handleSingpass}
              disabled={singpassLoading}
              className={cn(
                "w-full flex items-center justify-center gap-3 rounded-xl border-2 px-4 py-4 text-white font-semibold text-sm transition-all duration-200",
                "border-[#e04645] bg-[#e04645] hover:bg-[#c73c3b] active:scale-[0.98]",
                "disabled:opacity-60 disabled:cursor-not-allowed"
              )}
            >
              {singpassLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Connecting to Singpass…
                </span>
              ) : (
                <>
                  <span className="text-white font-semibold">Login with</span>
                  <Image
                    src="/images/singpass_logo_white-1.png"
                    alt="Singpass"
                    width={96}
                    height={26}
                    className="h-[22px] w-auto translate-y-[2px]"
                    style={{ mixBlendMode: "screen" }}
                  />
                </>
              )}
            </button>

            <div className="flex items-center gap-3 my-5">
              <div className="h-px flex-1 bg-[var(--border-subtle)]" />
              <span className="text-xs text-[var(--text-tertiary)] font-medium">or</span>
              <div className="h-px flex-1 bg-[var(--border-subtle)]" />
            </div>

            {/* OTP Section */}
            {!showOtp ? (
              <button
                onClick={() => setShowOtp(true)}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--border-medium)] bg-transparent px-4 py-3.5 text-sm font-medium text-[var(--text-secondary)] transition-all duration-200 hover:border-[var(--border-medium)] hover:bg-[var(--surface-secondary)] active:scale-[0.98]"
              >
                <DeviceMobile size={18} />
                Sign in with Mobile OTP
              </button>
            ) : (
              <div className="animate-fade-up space-y-4">
                {/* Discourage banner */}
                <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-3 text-xs text-amber-800">
                  <Warning size={16} className="mt-0.5 shrink-0 text-amber-500" />
                  <p>
                    <span className="font-semibold">We recommend using Singpass</span> for a faster and more secure experience.
                  </p>
                </div>

                {!otpSent ? (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
                        Mobile Number
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="flex h-12 items-center justify-center rounded-xl border border-[var(--border-medium)] bg-[var(--surface-secondary)] px-3.5 text-sm font-medium text-[var(--text-secondary)] whitespace-nowrap">
                          +65
                        </span>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="9123 4567"
                          maxLength={9}
                          className="flex-1 h-12 rounded-xl border border-[var(--border-medium)] bg-[var(--surface-elevated)] px-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleSendOtp}
                      disabled={isLoading || phone.replace(/\s/g, "").length < 8}
                      className={cn(
                        "w-full rounded-xl py-3.5 text-sm font-semibold transition-all duration-200",
                        "bg-brand-teal text-[var(--text-primary)] hover:opacity-90 active:scale-[0.98]",
                        "disabled:opacity-40 disabled:cursor-not-allowed"
                      )}
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-4 w-4 rounded-full border-2 border-gray-400/30 border-t-gray-600 animate-spin" />
                          Sending OTP…
                        </span>
                      ) : (
                        "Send OTP"
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
                        Enter 6-digit OTP
                      </label>
                      <p className="text-xs text-[var(--text-tertiary)] mb-3">
                        Sent to +65 {phone}
                      </p>
                      <div className="flex gap-2 justify-center">
                        {otp.map((digit, i) => (
                          <input
                            key={i}
                            ref={(el) => { otpRefs.current[i] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(i, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                            className={cn(
                              "h-12 w-12 rounded-xl border text-center text-lg font-bold text-[var(--text-primary)] outline-none transition-all",
                              "focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10",
                              otpError
                                ? "border-red-400 bg-red-50"
                                : "border-[var(--border-medium)] bg-[var(--surface-elevated)]"
                            )}
                          />
                        ))}
                      </div>
                      {otpError && (
                        <p className="mt-2 text-xs text-red-600 text-center">
                          Please enter a valid 6-digit OTP.
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleOtpVerify}
                      disabled={isLoading || otp.join("").length < 6}
                      className={cn(
                        "w-full rounded-xl py-3.5 text-sm font-semibold transition-all duration-200",
                        "bg-brand-blue text-white hover:opacity-90 active:scale-[0.98]",
                        "disabled:opacity-40 disabled:cursor-not-allowed"
                      )}
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          Verifying…
                        </span>
                      ) : (
                        "Verify & Sign In"
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setOtpSent(false);
                        setOtp(["", "", "", "", "", ""]);
                        setPhone("");
                        setOtpError(false);
                      }}
                      className="w-full text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors py-1"
                    >
                      ← Change number
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Security note */}
            <div className="flex items-center gap-2 mt-6 pt-5 border-t border-[var(--border-subtle)]">
              <ShieldCheck size={15} className="text-[var(--text-tertiary)] shrink-0" />
              <p className="text-xs text-[var(--text-tertiary)]">
                Your session is encrypted and secured with 256-bit SSL.
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-[var(--text-tertiary)] mt-6 leading-relaxed">
            By signing in, you agree to our{" "}
            <a
              href="https://crawfort.com/sg/terms/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-[var(--text-secondary)]"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="https://crawfort.com/sg/privacy/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-[var(--text-secondary)]"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>

      <footer className="px-5 pb-8 text-center">
        <div className="flex items-center justify-center gap-1 text-xs text-[var(--text-tertiary)]">
          <LockKey size={13} />
          <span>CF Money Pte. Ltd. — Licensed Moneylender</span>
        </div>
      </footer>
    </div>
  );
}
