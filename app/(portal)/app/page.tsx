"use client";

import { usePortal, PortalProvider } from "./portal-context";
import { PortalLayout } from "./portal-layout";
import { LoginScreen } from "./login";
import { Dashboard } from "./dashboard";
import { LoanDetail } from "./loan-detail";
import { MakePayment } from "./make-payment";
import { LoanContract } from "./loan-contract";
import { Settings } from "./settings";

function Toast() {
  const { toastMessage, dismissToast } = usePortal();
  if (!toastMessage) return null;

  return (
    <div
      className="fixed bottom-24 lg:bottom-8 left-1/2 z-[100] -translate-x-1/2 px-5 w-full max-w-[400px]"
      onClick={dismissToast}
    >
      <div className="animate-fade-up rounded-2xl bg-[oklch(0.18_0.02_260)] px-5 py-3.5 shadow-2xl">
        <p className="text-sm text-white text-center leading-relaxed">{toastMessage}</p>
      </div>
    </div>
  );
}

function PortalRouter() {
  const { view } = usePortal();

  const views: Record<string, React.ReactNode> = {
    dashboard: <Dashboard />,
    "loan-detail": <LoanDetail />,
    "make-payment": <MakePayment />,
    "loan-contract": <LoanContract />,
    settings: <Settings />,
  };

  if (view.type === "login") {
    return (
      <>
        <LoginScreen />
        <Toast />
      </>
    );
  }

  return (
    <PortalLayout>
      {views[view.type] ?? <Dashboard />}
      <Toast />
    </PortalLayout>
  );
}

export default function AppPage() {
  return (
    <PortalProvider>
      <PortalRouter />
    </PortalProvider>
  );
}
