import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arc Mail",
  description: "Une boîte mail avec l'interface du navigateur Arc.",
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="overflow-hidden">{children}</body>
    </html>
  );
}
