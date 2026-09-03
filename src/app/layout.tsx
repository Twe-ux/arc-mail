import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { KeyboardInset } from "@/components/pwa/keyboard-inset";
import { ViewportSlack } from "@/components/pwa/viewport-slack";
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
      {/* No overflow guard on html/body: any non-visible overflow on the root chain
          perturbs how WebKit resolves `position: fixed` on the first frame of a
          home-screen install. The shell clips itself. */}
      <body>
        {children}
        <ViewportSlack />
        <KeyboardInset />
        <PwaRegister />
      </body>
    </html>
  );
}
