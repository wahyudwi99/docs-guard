import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
