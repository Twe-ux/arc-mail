"use client";

import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";

const DISMISS_KEY = "arc-mail.install-hint.dismissed";

function isIosSafariBrowser(): boolean {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as { standalone?: boolean }).standalone));
  return ios && !standalone;
}

/**
 * iOS has no install prompt: the only way onto the home screen is Safari's share sheet.
 * Shown once, in the mobile drawer, until dismissed.
 */
export function InstallHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      /* private mode */
    }
    setVisible(isIosSafariBrowser());
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
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
