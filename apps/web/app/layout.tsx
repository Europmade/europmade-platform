import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EuropMade — Kwaliteitsproducten uit Europa",
  description:
    "Het meest transparante, betrouwbare en eerlijke marketplace-platform van Europa, voor producten die daadwerkelijk in Europa zijn geproduceerd.",
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
