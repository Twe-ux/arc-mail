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
  themeColor: "#6d28d9",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

/**
 * Read the stored theme and paint with it, before anything is painted at all.
 *
 * The class is otherwise put on by `AppShell` in an effect, i.e. after
 * hydration, so every load began with a light frame and flipped — a white flash
 * you can't miss in the dark, and the most visible right after a pull to
 * refresh, which reloads the document on purpose. Blocking and inline: the point
 * is to run before the first paint, so it must not be deferred or bundled.
 * `colorScheme` goes with it, so the canvas the browser paints around us during
 * the navigation is dark too, not just our own background.
 */
const THEME_SCRIPT = `try{var s=localStorage.getItem("arc-mail");var d=!!(s&&JSON.parse(s).state&&JSON.parse(s).state.dark);var e=document.documentElement;if(d)e.classList.add("dark");e.style.colorScheme=d?"dark":"light"}catch(_){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
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
