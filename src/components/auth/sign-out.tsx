"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { supabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useSession } from "./session";

/**
 * L'adresse connectée et la sortie. Ne rend rien quand personne n'est
 * connecté — c'est-à-dire tant que Supabase n'est pas configuré, où l'app
 * reste la maquette ouverte d'aujourd'hui.
 *
 * `signOut()` efface les cookies de session, qui sont ceux que lit le serveur ;
 * `refresh()` fait rejouer le rendu serveur avec cet état-là, sinon la porte
 * s'afficherait par-dessus une boîte encore montée.
 */
export function SignOut({ className, tone = "sombre" }: { className?: string; tone?: "sombre" | "clair" }) {
  const session = useSession();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  if (!session) return null;

  const go = async () => {
    setPending(true);
    await supabaseBrowser().auth.signOut();
    router.push("/connexion");
    router.refresh();
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        title={session.email}
        className={cn("min-w-0 flex-1 truncate text-xs", tone === "clair" ? "text-white/85" : "text-muted-foreground")}
      >
        {session.email}
      </span>
      <button
        type="button"
        onClick={go}
        disabled={pending}
        aria-label="Se déconnecter"
        className={cn(
          "relative flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors after:absolute after:-inset-1 disabled:opacity-50",
          tone === "clair" ? "text-white/85 hover:bg-white/15 hover:text-white" : "text-muted-foreground active:bg-muted",
        )}
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
}
