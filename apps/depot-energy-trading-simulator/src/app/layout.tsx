import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Depot Energy Trading Simulator — Germany",
  description:
    "Run an electric truck depot through the German day-ahead, intraday and imbalance settlement markets. Pick a BRP, trade, and read your invoice.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
