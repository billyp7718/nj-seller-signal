import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NJ Seller Signal",
  description: "Find and prioritize likely residential seller opportunities across New Jersey.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
