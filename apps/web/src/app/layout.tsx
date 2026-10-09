import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { AppProviders } from "@/components/providers";

export const metadata: Metadata = {
  title: "BUKENS — Karpet UMKM",
  description: "Toko karpet online untuk UMKM.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-neutral-50 text-neutral-900">
        <AppProviders>
          <Navbar />
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        </AppProviders>
      </body>
    </html>
  );
}
