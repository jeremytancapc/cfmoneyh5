import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Account | CF Money",
  description: "Manage your CF Money loans, make payments, and view your account details.",
};

export default function PortalRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
