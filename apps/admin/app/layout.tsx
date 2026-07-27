import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EuropMade Admin",
  description: "EuropMade — interne beheeromgeving.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body className="font-sans">{children}</body>
    </html>
  );
}
