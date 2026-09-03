import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa/pwa-register";
import "./globals.css";

const APP_NAME = "Arc Mail";

export const metadata: Metadata = {
  title: APP_NAME,
  applicationName: APP_NAME,
  description: "Une boîte mail avec l'interface du navigateur Arc.",
  // iOS reads these to launch the site as a full-screen app from the home screen.
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="overflow-hidden">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
