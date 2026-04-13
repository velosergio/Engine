import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Battlefront Engine System",
  description: "Battlefront Engine System — RTS cenital con Next.js y Phaser",
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
