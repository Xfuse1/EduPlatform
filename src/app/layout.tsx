import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "EduPlatform",
  description: "منصة لإدارة مراكز الدروس في مصر",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html dir="rtl" lang="ar">
      <body>{children}</body>
    </html>
  );
}
