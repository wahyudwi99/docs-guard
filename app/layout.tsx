import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/hooks/useI18n";

export const metadata: Metadata = {
  title: "DocsGuard",
  description: "Cross-platform mobile app for watermarking documents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
