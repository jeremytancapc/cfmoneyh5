"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Bell,
  CaretRight,
  DeviceMobile,
  Envelope,
  Globe,
  Info,
  LockKey,
  MonitorPlay,
  Question,
  ShieldCheck,
  SignOut,
  Translate,
  UserCircle,
  Warning,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { usePortal } from "./portal-context";

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none",
        checked ? "bg-brand-blue" : "bg-[var(--border-medium)]"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}

function SettingsRow({
  icon,
  label,
  sub,
  right,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      className={cn(
        "flex w-full items-center gap-3.5 px-5 py-3.5 text-left transition-colors",
        onClick && "cursor-pointer hover:bg-[var(--surface-secondary)] active:bg-[var(--surface-secondary)]",
        !onClick && "cursor-default"
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          danger
            ? "bg-red-50 text-red-500"
            : "bg-[var(--surface-secondary)] text-[var(--text-secondary)]"
        )}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium",
            danger ? "text-red-600" : "text-[var(--text-primary)]"
          )}
        >
          {label}
        </p>
        {sub && <p className="text-xs text-[var(--text-tertiary)] mt-0.5 truncate">{sub}</p>}
      </div>
      {right ?? (onClick && <CaretRight size={15} className="text-[var(--text-tertiary)] shrink-0" />)}
    </div>
  );
}

function SettingsGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="px-5 pb-2 text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
        {title}
      </p>
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] overflow-hidden divide-y divide-[var(--border-subtle)]">
        {children}
      </div>
    </div>
  );
}

export function Settings() {
  const { user, goBack, logout, showToast, authMethod } = usePortal();
  const [notifyPayments, setNotifyPayments] = useState(true);
  const [notifyPromo, setNotifyPromo] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <div className="pb-28 lg:pb-10">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--surface-primary)] border-b border-[var(--border-subtle)] px-5 py-4 sm:px-6 lg:px-8">
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>
      </div>

      <div className="px-5 pt-6 pb-2 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-5">
          Settings
        </h1>
      </div>

      <div className="px-5 sm:px-6 lg:px-8 space-y-5">
        {/* Profile */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-blue text-white text-xl font-display font-bold">
              {user?.firstName?.charAt(0) ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-[var(--text-primary)] text-lg leading-tight">
                {user?.fullName}
              </p>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                Member since {user?.memberSince}
              </p>
              {authMethod && (
                <div className="flex items-center gap-1 mt-1">
                  <ShieldCheck size={12} className={authMethod === "singpass" ? "text-red-500" : "text-brand-blue"} />
                  <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">
                    {authMethod === "singpass" ? "Singpass Verified" : "OTP Verified"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Account */}
        <SettingsGroup title="Account">
          <SettingsRow
            icon={<UserCircle size={18} />}
            label="Full Name"
            sub={user?.fullName}
            right={<span className="text-xs text-[var(--text-tertiary)]">{user?.fullName}</span>}
          />
          <SettingsRow
            icon={<Info size={18} />}
            label="NRIC / FIN"
            sub="Identity number"
            right={<span className="text-xs font-mono text-[var(--text-tertiary)]">{user?.nricMasked}</span>}
          />
          <SettingsRow
            icon={<DeviceMobile size={18} />}
            label="Mobile Number"
            sub={user?.mobile}
            onClick={() => showToast("Mobile number change requires in-person verification at our office.")}
          />
          <SettingsRow
            icon={<Envelope size={18} />}
            label="Email Address"
            sub={user?.email}
            onClick={() => showToast("Email change coming soon.")}
          />
        </SettingsGroup>

        {/* Notifications */}
        <SettingsGroup title="Notifications">
          <SettingsRow
            icon={<Bell size={18} />}
            label="Payment Reminders"
            sub="Get notified before upcoming payments"
            right={
              <Toggle
                checked={notifyPayments}
                onChange={setNotifyPayments}
              />
            }
          />
          <SettingsRow
            icon={<Bell size={18} />}
            label="Promotions & Offers"
            sub="New loan products and exclusive deals"
            right={
              <Toggle
                checked={notifyPromo}
                onChange={setNotifyPromo}
              />
            }
          />
        </SettingsGroup>

        {/* Security */}
        <SettingsGroup title="Security">
          <SettingsRow
            icon={<LockKey size={18} />}
            label="Login Method"
            sub={authMethod === "singpass" ? "Singpass (Recommended)" : "Mobile OTP"}
            onClick={() => showToast("Change login method at next sign-in.")}
          />
          <SettingsRow
            icon={<MonitorPlay size={18} />}
            label="Active Sessions"
            sub="Manage devices logged in to your account"
            onClick={() => showToast("Session management coming soon.")}
          />
          <SettingsRow
            icon={<ShieldCheck size={18} />}
            label="Two-Factor Authentication"
            sub="Additional security for your account"
            onClick={() => showToast("2FA setup coming soon.")}
          />
        </SettingsGroup>

        {/* Preferences */}
        <SettingsGroup title="Preferences">
          <SettingsRow
            icon={<Translate size={18} />}
            label="Language"
            sub="English"
            right={<span className="text-xs text-[var(--text-tertiary)]">English</span>}
            onClick={() => showToast("Language switching coming soon.")}
          />
          <SettingsRow
            icon={<Globe size={18} />}
            label="Region"
            right={<span className="text-xs text-[var(--text-tertiary)]">Singapore</span>}
          />
        </SettingsGroup>

        {/* Help */}
        <SettingsGroup title="Help & Support">
          <SettingsRow
            icon={<Question size={18} />}
            label="FAQs"
            sub="Frequently asked questions"
            onClick={() => showToast("Opening FAQs...")}
          />
          <SettingsRow
            icon={<Envelope size={18} />}
            label="Contact Us"
            sub="hellosg@crawfort.com · +65 6777 8080"
            onClick={() => showToast("Contact: +65 6777 8080 or hellosg@crawfort.com")}
          />
          <SettingsRow
            icon={<Warning size={18} />}
            label="Report an Issue"
            sub="Technical problems or complaints"
            onClick={() => showToast("Please email hellosg@crawfort.com with your issue.")}
          />
        </SettingsGroup>

        {/* Legal */}
        <SettingsGroup title="Legal">
          <SettingsRow
            icon={<Info size={18} />}
            label="Terms of Service"
            onClick={() => window.open("https://crawfort.com/sg/terms/", "_blank")}
          />
          <SettingsRow
            icon={<ShieldCheck size={18} />}
            label="Privacy Policy"
            onClick={() => window.open("https://crawfort.com/sg/privacy/", "_blank")}
          />
          <SettingsRow
            icon={<Info size={18} />}
            label="App Version"
            right={<span className="text-xs text-[var(--text-tertiary)]">1.0.0</span>}
          />
        </SettingsGroup>

        {/* Logout */}
        <div className="rounded-2xl border border-red-100 bg-[var(--surface-elevated)] overflow-hidden">
          <SettingsRow
            icon={<SignOut size={18} />}
            label="Sign Out"
            sub="You will be signed out from this device"
            onClick={() => setShowLogoutConfirm(true)}
            danger
          />
        </div>
      </div>

      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:px-4">
          <div
            className="absolute inset-0"
            style={{
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              background: "oklch(0.18 0.02 260 / 0.55)",
            }}
            onClick={() => setShowLogoutConfirm(false)}
          />
          <div
            className="relative z-10 w-full sm:max-w-[400px] rounded-t-3xl sm:rounded-3xl bg-[var(--surface-elevated)] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <SignOut size={22} className="text-red-500" />
              </div>
            </div>
            <h3 className="font-display text-lg font-bold text-[var(--text-primary)] text-center mb-1">
              Sign Out?
            </h3>
            <p className="text-sm text-[var(--text-tertiary)] text-center mb-6">
              You will be signed out of your account on this device.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded-xl border border-[var(--border-medium)] py-3 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
                className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-semibold text-white hover:bg-red-600 transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
