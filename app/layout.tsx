import type { Metadata } from "next";
import { quicksand, manrope } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Crawfort | Apply for a Loan",
    template: "%s | Crawfort",
  },
  description:
    "Apply for a personal loan in minutes. Get approved by a licensed money lender in Singapore.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${quicksand.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
