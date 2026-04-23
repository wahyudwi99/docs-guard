import type { Metadata, Viewport } from "next";
import "./globals.css";
import { I18nProvider } from "@/hooks/useI18n";

export const metadata: Metadata = {
  title: "DocsGuard",
  description: "Cross-platform mobile app for watermarking documents",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
