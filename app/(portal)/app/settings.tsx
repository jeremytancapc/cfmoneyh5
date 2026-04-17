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
  Scales,
  Gear,
  User,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { usePortal } from "./portal-context";
import { PageHeader } from "./portal-layout";

type SectionKey =
  | "account"
  | "notifications"
  | "security"
  | "preferences"
  | "help"
  | "legal";

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
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "flex w-full items-center gap-3.5 px-5 py-3.5 text-left transition-colors",
        onClick &&
          "cursor-pointer hover:bg-[var(--surface-secondary)] active:bg-[var(--surface-secondary)]",
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
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium",
            danger ? "text-red-600" : "text-[var(--text-primary)]"
          )}
        >
          {label}
        </p>
        {sub && (
          <p className="mt-0.5 truncate text-xs text-[var(--text-tertiary)]">
            {sub}
          </p>
        )}
      </div>
      {right ??
        (onClick && (
          <CaretRight
            size={15}
            className="shrink-0 text-[var(--text-tertiary)]"
          />
        ))}
    </div>
  );
}

function SettingsGroup({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      {title && (
        <p className="px-5 pb-2 text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
          {title}
        </p>
      )}
      <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] divide-y divide-[var(--border-subtle)]">
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
  const [activeSection, setActiveSection] = useState<SectionKey>("account");

  const sections: {
    key: SectionKey;
    label: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: "account",
      label: "Account",
      description: "Your personal details and identity",
      icon: <User size={18} />,
    },
    {
      key: "notifications",
      label: "Notifications",
      description: "What we tell you about",
      icon: <Bell size={18} />,
    },
    {
      key: "security",
      label: "Security",
      description: "Login method, sessions, 2FA",
      icon: <ShieldCheck size={18} />,
    },
    {
      key: "preferences",
      label: "Preferences",
      description: "Language and region",
      icon: <Gear size={18} />,
    },
    {
      key: "help",
      label: "Help & support",
      description: "Contact us, FAQs, report issues",
      icon: <Question size={18} />,
    },
    {
      key: "legal",
      label: "Legal",
      description: "Terms, privacy, app version",
      icon: <Scales size={18} />,
    },
  ];

  const Profile = (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-blue font-display text-xl font-bold text-white">
          {user?.firstName?.charAt(0) ?? "U"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold leading-tight text-[var(--text-primary)]">
            {user?.fullName}
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
            Member since {user?.memberSince}
          </p>
          {authMethod && (
            <div className="mt-1 flex items-center gap-1">
              <ShieldCheck
                size={12}
                className={
                  authMethod === "singpass" ? "text-red-500" : "text-brand-blue"
                }
              />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                {authMethod === "singpass"
                  ? "Singpass Verified"
                  : "OTP Verified"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const AccountGroup = (
    <SettingsGroup>
      <SettingsRow
        icon={<UserCircle size={18} />}
        label="Full Name"
        sub={user?.fullName}
        right={
          <span className="text-xs text-[var(--text-tertiary)]">
            {user?.fullName}
          </span>
        }
      />
      <SettingsRow
        icon={<Info size={18} />}
        label="NRIC / FIN"
        sub="Identity number"
        right={
          <span className="font-mono text-xs text-[var(--text-tertiary)]">
            {user?.nricMasked}
          </span>
        }
      />
      <SettingsRow
        icon={<DeviceMobile size={18} />}
        label="Mobile Number"
        sub={user?.mobile}
        onClick={() =>
          showToast(
            "Mobile number change requires in-person verification at our office."
          )
        }
      />
      <SettingsRow
        icon={<Envelope size={18} />}
        label="Email Address"
        sub={user?.email}
        onClick={() => showToast("Email change coming soon.")}
      />
    </SettingsGroup>
  );

  const NotificationsGroup = (
    <SettingsGroup>
      <SettingsRow
        icon={<Bell size={18} />}
        label="Payment Reminders"
        sub="Get notified before upcoming payments"
        right={
          <Toggle checked={notifyPayments} onChange={setNotifyPayments} />
        }
      />
      <SettingsRow
        icon={<Bell size={18} />}
        label="Promotions & Offers"
        sub="New loan products and exclusive deals"
        right={<Toggle checked={notifyPromo} onChange={setNotifyPromo} />}
      />
    </SettingsGroup>
  );

  const SecurityGroup = (
    <SettingsGroup>
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
  );

  const PreferencesGroup = (
    <SettingsGroup>
      <SettingsRow
        icon={<Translate size={18} />}
        label="Language"
        sub="English"
        right={
          <span className="text-xs text-[var(--text-tertiary)]">English</span>
        }
        onClick={() => showToast("Language switching coming soon.")}
      />
      <SettingsRow
        icon={<Globe size={18} />}
        label="Region"
        right={
          <span className="text-xs text-[var(--text-tertiary)]">Singapore</span>
        }
      />
    </SettingsGroup>
  );

  const HelpGroup = (
    <SettingsGroup>
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
        onClick={() =>
          showToast("Contact: +65 6777 8080 or hellosg@crawfort.com")
        }
      />
      <SettingsRow
        icon={<Warning size={18} />}
        label="Report an Issue"
        sub="Technical problems or complaints"
        onClick={() =>
          showToast("Please email hellosg@crawfort.com with your issue.")
        }
      />
    </SettingsGroup>
  );

  const LegalGroup = (
    <SettingsGroup>
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
  );

  const LogoutBlock = (
    <div className="overflow-hidden rounded-2xl border border-red-100 bg-[var(--surface-elevated)]">
      <SettingsRow
        icon={<SignOut size={18} />}
        label="Sign Out"
        sub="You will be signed out from this device"
        onClick={() => setShowLogoutConfirm(true)}
        danger
      />
    </div>
  );

  const sectionContent: Record<SectionKey, React.ReactNode> = {
    account: (
      <div className="space-y-5">
        {Profile}
        {AccountGroup}
      </div>
    ),
    notifications: NotificationsGroup,
    security: SecurityGroup,
    preferences: PreferencesGroup,
    help: HelpGroup,
    legal: (
      <div className="space-y-5">
        {LegalGroup}
        {LogoutBlock}
      </div>
    ),
  };

  const activeMeta = sections.find((s) => s.key === activeSection);

  return (
    <>
      {/* ─── Mobile view (unchanged) ─────────────────────────────── */}
      <div className="pb-28 lg:hidden">
        <div className="sticky top-0 z-10 border-b border-[var(--border-subtle)] bg-[var(--surface-primary)] px-5 py-4 sm:px-6">
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>

        <div className="px-5 pt-6 pb-2 sm:px-6">
          <h1 className="mb-5 font-display text-2xl font-bold text-[var(--text-primary)]">
            Settings
          </h1>
        </div>

        <div className="space-y-5 px-5 sm:px-6">
          {Profile}
          <SettingsGroup title="Account">
            <SettingsRow
              icon={<UserCircle size={18} />}
              label="Full Name"
              sub={user?.fullName}
              right={
                <span className="text-xs text-[var(--text-tertiary)]">
                  {user?.fullName}
                </span>
              }
            />
            <SettingsRow
              icon={<Info size={18} />}
              label="NRIC / FIN"
              sub="Identity number"
              right={
                <span className="font-mono text-xs text-[var(--text-tertiary)]">
                  {user?.nricMasked}
                </span>
              }
            />
            <SettingsRow
              icon={<DeviceMobile size={18} />}
              label="Mobile Number"
              sub={user?.mobile}
              onClick={() =>
                showToast(
                  "Mobile number change requires in-person verification at our office."
                )
              }
            />
            <SettingsRow
              icon={<Envelope size={18} />}
              label="Email Address"
              sub={user?.email}
              onClick={() => showToast("Email change coming soon.")}
            />
          </SettingsGroup>

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
              right={<Toggle checked={notifyPromo} onChange={setNotifyPromo} />}
            />
          </SettingsGroup>

          <SettingsGroup title="Security">
            <SettingsRow
              icon={<LockKey size={18} />}
              label="Login Method"
              sub={
                authMethod === "singpass"
                  ? "Singpass (Recommended)"
                  : "Mobile OTP"
              }
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

          <SettingsGroup title="Preferences">
            <SettingsRow
              icon={<Translate size={18} />}
              label="Language"
              sub="English"
              right={
                <span className="text-xs text-[var(--text-tertiary)]">
                  English
                </span>
              }
              onClick={() => showToast("Language switching coming soon.")}
            />
            <SettingsRow
              icon={<Globe size={18} />}
              label="Region"
              right={
                <span className="text-xs text-[var(--text-tertiary)]">
                  Singapore
                </span>
              }
            />
          </SettingsGroup>

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
              onClick={() =>
                showToast("Contact: +65 6777 8080 or hellosg@crawfort.com")
              }
            />
            <SettingsRow
              icon={<Warning size={18} />}
              label="Report an Issue"
              sub="Technical problems or complaints"
              onClick={() =>
                showToast("Please email hellosg@crawfort.com with your issue.")
              }
            />
          </SettingsGroup>

          <SettingsGroup title="Legal">
            <SettingsRow
              icon={<Info size={18} />}
              label="Terms of Service"
              onClick={() =>
                window.open("https://crawfort.com/sg/terms/", "_blank")
              }
            />
            <SettingsRow
              icon={<ShieldCheck size={18} />}
              label="Privacy Policy"
              onClick={() =>
                window.open("https://crawfort.com/sg/privacy/", "_blank")
              }
            />
            <SettingsRow
              icon={<Info size={18} />}
              label="App Version"
              right={
                <span className="text-xs text-[var(--text-tertiary)]">
                  1.0.0
                </span>
              }
            />
          </SettingsGroup>

          {LogoutBlock}
        </div>
      </div>

      {/* ─── Desktop view ────────────────────────────────────────── */}
      <PageHeader
        title="Settings"
        subtitle="Manage your account, security, and preferences."
      />

      <div className="hidden lg:grid px-8 py-8 xl:px-10 gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="sticky top-8 self-start">
          <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
            {sections.map((section) => {
              const isActive = activeSection === section.key;
              return (
                <button
                  key={section.key}
                  onClick={() => setActiveSection(section.key)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-[var(--border-subtle)] px-4 py-3.5 text-left transition-colors last:border-b-0",
                    isActive
                      ? "bg-brand-blue/5"
                      : "hover:bg-[var(--surface-secondary)]"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      isActive
                        ? "bg-brand-blue/10 text-brand-blue"
                        : "bg-[var(--surface-secondary)] text-[var(--text-secondary)]"
                    )}
                  >
                    {section.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        isActive
                          ? "text-brand-blue"
                          : "text-[var(--text-primary)]"
                      )}
                    >
                      {section.label}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                      {section.description}
                    </p>
                  </div>
                  <CaretRight
                    size={14}
                    className={cn(
                      "mt-3 shrink-0 transition-colors",
                      isActive
                        ? "text-brand-blue"
                        : "text-[var(--text-tertiary)]"
                    )}
                  />
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-[var(--surface-elevated)] py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
          >
            <SignOut size={16} />
            Sign out
          </button>
        </aside>

        <div className="min-w-0">
          <div className="mb-5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
              {activeMeta?.description}
            </p>
            <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">
              {activeMeta?.label}
            </h2>
          </div>
          <div className="max-w-[640px] animate-fade-up" key={activeSection}>
            {sectionContent[activeSection]}
          </div>
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
            className="relative z-10 w-full rounded-t-3xl bg-[var(--surface-elevated)] p-6 sm:max-w-[400px] sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <SignOut size={22} className="text-red-500" />
              </div>
            </div>
            <h3 className="mb-1 text-center font-display text-lg font-bold text-[var(--text-primary)]">
              Sign Out?
            </h3>
            <p className="mb-6 text-center text-sm text-[var(--text-tertiary)]">
              You will be signed out of your account on this device.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded-xl border border-[var(--border-medium)] py-3 text-sm font-semibold text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-secondary)]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
                className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-semibold text-white transition-all hover:bg-red-600"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
