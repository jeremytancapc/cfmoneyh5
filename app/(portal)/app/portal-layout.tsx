"use client";

import Image from "next/image";
import {
  Gear,
  House,
  CreditCard,
  FileText,
  FileArrowUp,
  List,
  X,
  Plus,
  SignOut,
  CaretRight,
} from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { usePortal } from "./portal-context";

type NavItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
  onClick: () => void;
  isActive: boolean;
};

export function PortalLayout({ children }: { children: React.ReactNode }) {
  const { view, navigate, isAuthenticated, user, loans, logout } = usePortal();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isDashboard = view.type === "dashboard";
  const isLoans = view.type === "loan-detail" || view.type === "loan-contract";
  const isPayment = view.type === "make-payment";
  const isSettings = view.type === "settings";

  const payableLoanId =
    loans.find((l) => l.status === "overdue")?.loanId ??
    loans.find((l) => l.status === "active")?.loanId ??
    loans[0]?.loanId;

  const navItems: NavItem[] = [
    {
      key: "dashboard",
      label: "Home",
      icon: <House size={20} />,
      activeIcon: <House size={20} weight="fill" />,
      onClick: () => navigate({ type: "dashboard" }),
      isActive: isDashboard,
    },
    {
      key: "loans",
      label: "My Loans",
      icon: <FileText size={20} />,
      activeIcon: <FileText size={20} weight="fill" />,
      onClick: () =>
        payableLoanId
          ? navigate({ type: "loan-detail", loanId: payableLoanId })
          : navigate({ type: "dashboard" }),
      isActive: isLoans,
    },
    {
      key: "payment",
      label: "Payments",
      icon: <CreditCard size={20} />,
      activeIcon: <CreditCard size={20} weight="fill" />,
      onClick: () =>
        payableLoanId
          ? navigate({ type: "make-payment", loanId: payableLoanId })
          : navigate({ type: "dashboard" }),
      isActive: isPayment,
    },
    {
      key: "settings",
      label: "Settings",
      icon: <Gear size={20} />,
      activeIcon: <Gear size={20} weight="fill" />,
      onClick: () => navigate({ type: "settings" }),
      isActive: isSettings,
    },
  ];

  const mobileNavItems = navItems.filter((n) => n.key !== "settings");

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-[100dvh] lg:flex-row">
      {/* ─── Desktop sidebar ────────────────────────────────────────── */}
      <aside className="hidden lg:flex sticky top-0 z-30 h-[100dvh] w-[260px] shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
        <div className="px-5 py-6 border-b border-[var(--border-subtle)]">
          <button
            onClick={() => navigate({ type: "dashboard" })}
            className="flex items-center"
            aria-label="CF Money home"
          >
            <Image
              src="/images/cf-money-full-color.png"
              alt="CF Money"
              width={140}
              height={40}
              className="h-6 w-auto"
              priority
            />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
            Workspace
          </p>
          <div className="flex flex-col gap-0.5">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={item.onClick}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-150",
                  item.isActive
                    ? "bg-brand-blue/10 text-brand-blue"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                <span className="shrink-0">
                  {item.isActive ? item.activeIcon : item.icon}
                </span>
                <span className="flex-1 text-left">{item.label}</span>
                {item.key === "payment" && loans.some((l) => l.status === "overdue") && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {loans.filter((l) => l.status === "overdue").length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="my-5 border-t border-[var(--border-subtle)]" />

          <button
            onClick={() => window.open("/", "_self")}
            className="flex w-full items-center gap-3 rounded-xl bg-brand-blue px-3 py-3 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15">
              <Plus size={16} weight="bold" />
            </span>
            <span className="flex-1 text-left">Apply for new loan</span>
          </button>

          <button
            onClick={() =>
              payableLoanId
                ? navigate({ type: "loan-contract", loanId: payableLoanId })
                : navigate({ type: "dashboard" })
            }
            className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
          >
            <FileArrowUp size={18} className="shrink-0" />
            <span className="flex-1 text-left">Statements</span>
          </button>
        </nav>

        {/* User footer */}
        <div className="border-t border-[var(--border-subtle)] p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-blue text-sm font-bold text-white">
              {user?.firstName?.charAt(0) ?? "U"}
            </div>
            <button
              onClick={() => navigate({ type: "settings" })}
              className="flex-1 min-w-0 text-left"
            >
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                {user?.fullName}
              </p>
              <p className="truncate text-xs text-[var(--text-tertiary)]">
                {user?.nricMasked}
              </p>
            </button>
            <button
              onClick={logout}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition-colors hover:bg-red-50 hover:text-red-500"
              aria-label="Sign out"
              title="Sign out"
            >
              <SignOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ─── Content column ─────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col lg:bg-[var(--surface-canvas)]">
        {/* Mobile top bar (hidden on desktop) */}
        <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-5 sm:px-6 lg:hidden">
          <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between gap-4">
            <button
              onClick={() => navigate({ type: "dashboard" })}
              className="flex shrink-0 items-center gap-2"
            >
              <Image
                src="/images/cf-money-full-color.png"
                alt="CF Money"
                width={120}
                height={36}
                className="h-5 w-auto"
                priority
              />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate({ type: "settings" })}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                  isSettings
                    ? "bg-brand-blue/10 text-brand-blue"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
                )}
                aria-label="Settings"
              >
                <Gear size={20} weight={isSettings ? "fill" : "regular"} />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-secondary)]"
                aria-label="Menu"
              >
                {mobileMenuOpen ? <X size={20} /> : <List size={20} />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="animate-fade-up border-t border-[var(--border-subtle)] pb-3 pt-2">
              <div className="mb-1 flex items-center gap-3 px-2 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue text-sm font-bold text-white">
                  {user?.firstName?.charAt(0) ?? "U"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {user?.fullName}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {user?.email}
                  </p>
                </div>
              </div>
              {navItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    item.onClick();
                    setMobileMenuOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                    item.isActive
                      ? "bg-brand-blue/10 text-brand-blue"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {item.isActive ? item.activeIcon : item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </header>

        <main className="flex-1">{children}</main>

        {/* Mobile bottom tab bar */}
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border-subtle)] bg-[var(--surface-elevated)] lg:hidden">
          <div className="flex items-center justify-around px-2 py-2">
            {mobileNavItems.map((item) => (
              <button
                key={item.key}
                onClick={item.onClick}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-semibold transition-all duration-150",
                  item.isActive
                    ? "text-brand-blue"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-xl transition-all",
                    item.isActive ? "bg-brand-blue/10" : ""
                  )}
                >
                  {item.isActive ? item.activeIcon : item.icon}
                </span>
                {item.label}
              </button>
            ))}
            <button
              onClick={() => navigate({ type: "settings" })}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-semibold transition-all duration-150",
                isSettings
                  ? "text-brand-blue"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl transition-all",
                  isSettings ? "bg-brand-blue/10" : ""
                )}
              >
                <Gear size={20} weight={isSettings ? "fill" : "regular"} />
              </span>
              Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shared desktop primitives ───────────────────────────────────────

/**
 * Desktop page header strip: title on the left, optional subtitle, contextual
 * actions on the right. Mobile pages render their own compact header above
 * this so this component only shows at `lg+`.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  breadcrumbs,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: { label: string; onClick?: () => void }[];
}) {
  return (
    <div className="hidden lg:block">
      <div className="flex flex-col gap-4 border-b border-[var(--border-subtle)] px-8 pb-6 pt-8 xl:px-10">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-tertiary)]">
            {breadcrumbs.map((crumb, i) => {
              const isLast = i === breadcrumbs.length - 1;
              return (
                <span key={i} className="flex items-center gap-1.5">
                  <button
                    onClick={crumb.onClick}
                    className={cn(
                      "transition-colors",
                      crumb.onClick && !isLast
                        ? "hover:text-[var(--text-primary)]"
                        : "",
                      isLast && "text-[var(--text-secondary)]"
                    )}
                    disabled={!crumb.onClick || isLast}
                  >
                    {crumb.label}
                  </button>
                  {!isLast && (
                    <CaretRight size={12} className="text-[var(--border-medium)]" />
                  )}
                </span>
              );
            })}
          </nav>
        )}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            {eyebrow && (
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                {eyebrow}
              </p>
            )}
            <h1 className="font-display text-3xl font-bold leading-tight text-[var(--text-primary)]">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2.5">{actions}</div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Two-column workspace body: primary column (fluid) + optional sticky rail
 * (360px). Rail is hidden below `xl` so mobile and narrow desktops stay
 * focused on the primary content.
 */
export function Workspace({
  primary,
  rail,
  className,
}: {
  primary: ReactNode;
  rail?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "hidden lg:grid px-8 py-8 xl:px-10",
        rail ? "xl:grid-cols-[minmax(0,1fr)_360px] gap-8" : "",
        className
      )}
    >
      <div className="min-w-0">{primary}</div>
      {rail && (
        <aside className="hidden xl:block">
          <div className="sticky top-8 space-y-6">{rail}</div>
        </aside>
      )}
    </div>
  );
}
