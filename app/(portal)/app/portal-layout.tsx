"use client";

import Image from "next/image";
import {
  Gear,
  House,
  CreditCard,
  FileText,
  List,
  X,
} from "@phosphor-icons/react";
import { useState } from "react";
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
  const { view, navigate, isAuthenticated, user } = usePortal();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isDashboard = view.type === "dashboard";
  const isLoans = view.type === "loan-detail" || view.type === "loan-contract";
  const isPayment = view.type === "make-payment";
  const isSettings = view.type === "settings";

  const navItems: NavItem[] = [
    {
      key: "dashboard",
      label: "Home",
      icon: <House size={22} />,
      activeIcon: <House size={22} weight="fill" />,
      onClick: () => navigate({ type: "dashboard" }),
      isActive: isDashboard,
    },
    {
      key: "loans",
      label: "Loans",
      icon: <FileText size={22} />,
      activeIcon: <FileText size={22} weight="fill" />,
      onClick: () => navigate({ type: "dashboard" }),
      isActive: isLoans,
    },
    {
      key: "payment",
      label: "Pay",
      icon: <CreditCard size={22} />,
      activeIcon: <CreditCard size={22} weight="fill" />,
      onClick: () => navigate({ type: "dashboard" }),
      isActive: isPayment,
    },
    {
      key: "settings",
      label: "Settings",
      icon: <Gear size={22} />,
      activeIcon: <Gear size={22} weight="fill" />,
      onClick: () => navigate({ type: "settings" }),
      isActive: isSettings,
    },
  ];

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      {/* Top header */}
      <header className="sticky top-0 z-30 bg-[var(--surface-elevated)] border-b border-[var(--border-subtle)] px-5 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4 max-w-screen-xl mx-auto">
          {/* Logo */}
          <button
            onClick={() => navigate({ type: "dashboard" })}
            className="flex items-center gap-2 shrink-0"
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

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={item.onClick}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-150",
                  item.isActive
                    ? "bg-brand-blue/10 text-brand-blue"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
                )}
              >
                {item.isActive ? item.activeIcon : item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          {/* Desktop right: user + settings */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border-subtle)] px-3 py-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-blue text-white text-xs font-bold">
                {user?.firstName?.charAt(0) ?? "U"}
              </div>
              <span className="text-sm font-medium text-[var(--text-primary)]">{user?.firstName}</span>
            </div>
            <button
              onClick={() => navigate({ type: "settings" })}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                isSettings
                  ? "bg-brand-blue/10 text-brand-blue"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
              )}
              aria-label="Settings"
            >
              <Gear size={20} weight={isSettings ? "fill" : "regular"} />
            </button>
          </div>

          {/* Mobile: settings + hamburger */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={() => navigate({ type: "settings" })}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                isSettings ? "bg-brand-blue/10 text-brand-blue" : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
              )}
              aria-label="Settings"
            >
              <Gear size={20} weight={isSettings ? "fill" : "regular"} />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors lg:hidden"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <List size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[var(--border-subtle)] pb-3 pt-2 animate-fade-up">
            <div className="flex items-center gap-3 px-2 py-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue text-white text-sm font-bold">
                {user?.firstName?.charAt(0) ?? "U"}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{user?.fullName}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{user?.email}</p>
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
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
                )}
              >
                {item.isActive ? item.activeIcon : item.icon}
                {item.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-screen-xl mx-auto w-full lg:px-8">
        {children}
      </main>

      {/* Mobile bottom tab bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)] lg:hidden safe-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => (
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
              <span className={cn(
                "flex h-8 w-8 items-center justify-center rounded-xl transition-all",
                item.isActive ? "bg-brand-blue/10" : ""
              )}>
                {item.isActive ? item.activeIcon : item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
