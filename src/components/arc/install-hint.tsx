"use client";

import { useSyncExternalStore } from "react";
import { Share, X } from "lucide-react";

const DISMISS_KEY = "arc-mail.install-hint.dismissed";
const CHANGE_EVENT = "arc-mail:install-hint";

function isIosSafariBrowser(): boolean {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as { standalone?: boolean }).standalone));
  return ios && !standalone;
}

function isDismissed(): boolean {
  try {
    return Boolean(localStorage.getItem(DISMISS_KEY));
  } catch {
    return false;
  }
}

const subscribe = (onChange: () => void) => {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
};
const getSnapshot = () => isIosSafariBrowser() && !isDismissed();
const getServerSnapshot = () => false;

/**
 * iOS has no install prompt: the only way onto the home screen is Safari's share sheet.
 * Shown in the mobile drawer until dismissed; the server renders nothing so hydration matches.
 */
export function InstallHint() {
  const visible = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private mode: the hint simply comes back next time */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return (
    <div className="relative shrink-0 rounded-xl bg-muted p-3 pr-8 text-xs leading-relaxed text-foreground">
      <p className="font-semibold">Installer Arc Mail</p>
      <p className="mt-0.5 text-muted-foreground">
        Touche <Share className="inline size-3.5 align-[-2px]" aria-label="Partager" /> puis « Sur l&apos;écran
        d&apos;accueil » pour l&apos;ouvrir en plein écran.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fermer"
        className="absolute top-2 right-2 rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
