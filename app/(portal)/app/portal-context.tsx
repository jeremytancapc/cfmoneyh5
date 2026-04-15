"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { MOCK_USER, MOCK_LOANS, MOCK_APPLICATIONS, type PortalUser, type Loan, type LoanApplication } from "./mock-data";

export type PortalView =
  | { type: "login" }
  | { type: "dashboard" }
  | { type: "loan-detail"; loanId: string }
  | { type: "make-payment"; loanId: string }
  | { type: "loan-contract"; loanId: string }
  | { type: "settings" };

export type AuthMethod = "singpass" | "otp";

interface PortalContextValue {
  isAuthenticated: boolean;
  authMethod: AuthMethod | null;
  user: PortalUser | null;
  loans: Loan[];
  applications: LoanApplication[];
  view: PortalView;
  viewHistory: PortalView[];
  loginWithSingpass: () => void;
  loginWithOtp: () => void;
  logout: () => void;
  navigate: (view: PortalView) => void;
  goBack: () => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  dismissToast: () => void;
}

const PortalContext = createContext<PortalContextValue | null>(null);

export function PortalProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMethod, setAuthMethod] = useState<AuthMethod | null>(null);
  const [view, setView] = useState<PortalView>({ type: "login" });
  const [viewHistory, setViewHistory] = useState<PortalView[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const navigate = useCallback((nextView: PortalView) => {
    setViewHistory((prev) => [...prev, view]);
    setView(nextView);
  }, [view]);

  const goBack = useCallback(() => {
    setViewHistory((prev) => {
      if (prev.length === 0) return prev;
      const history = [...prev];
      const last = history.pop()!;
      setView(last);
      return history;
    });
  }, []);

  const loginWithSingpass = useCallback(() => {
    setIsAuthenticated(true);
    setAuthMethod("singpass");
    setViewHistory([]);
    setView({ type: "dashboard" });
  }, []);

  const loginWithOtp = useCallback(() => {
    setIsAuthenticated(true);
    setAuthMethod("otp");
    setViewHistory([]);
    setView({ type: "dashboard" });
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setAuthMethod(null);
    setViewHistory([]);
    setView({ type: "login" });
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const dismissToast = useCallback(() => setToastMessage(null), []);

  return (
    <PortalContext.Provider
      value={{
        isAuthenticated,
        authMethod,
        user: isAuthenticated ? MOCK_USER : null,
        loans: isAuthenticated ? MOCK_LOANS : [],
        applications: isAuthenticated ? MOCK_APPLICATIONS : [],
        view,
        viewHistory,
        loginWithSingpass,
        loginWithOtp,
        logout,
        navigate,
        goBack,
        toastMessage,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </PortalContext.Provider>
  );
}

export function usePortal(): PortalContextValue {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error("usePortal must be used within PortalProvider");
  return ctx;
}
