import type { Metadata } from "next";

import "@/app/globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { Toaster } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "EduPlatform",
  description: "منصة لإدارة مراكز الدروس في مصر",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html dir="rtl" lang="ar" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
