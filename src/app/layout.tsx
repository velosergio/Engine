import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Engine RTS",
  description: "RTS cenital — Next.js + Phaser",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
