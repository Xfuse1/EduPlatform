import type { Metadata } from "next";

import "@/app/globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { APP_CONFIG } from "@/config/app";

export const metadata: Metadata = {
  title: APP_CONFIG.name,
  description: APP_CONFIG.shortDescription,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html dir="rtl" lang="ar" suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
