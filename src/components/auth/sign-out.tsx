"use client";

import { LogOut, Settings2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useSession } from "./session";

/**
 * Qui est connecté à l'app, et les deux portes qui partent de là.
 *
 * C'était une adresse brute en 12 px entre deux icônes muettes : la ligne
 * disait *quoi* sans dire *qui*, et les deux boutons ne disaient pas où ils
 * menaient. Un compte se reconnaît à un visage et à un nom — Google nous donne
 * les deux, on ne s'en servait pas.
 *
 * **L'adresse passe dans l'infobulle**, pas sur une seconde ligne : à la
 * largeur de la barre elle se ferait tronquer, et une adresse coupée ne dit
 * plus rien de ce qu'on lui demande. Le nom et le visage suffisent à
 * reconnaître, l'adresse à vérifier — et on ne vérifie qu'en cherchant.
 *
 * **Deux éléments, pas trois** : le bloc du compte est lui-même le lien vers
 * les boîtes, ce que l'engrenage faisait en double juste à côté.
 *
 * Ne rend rien quand personne n'est connecté — c'est-à-dire tant que Supabase
 * n'est pas configuré, où l'app reste la maquette ouverte d'aujourd'hui.
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

  const clair = tone === "clair";
  const bouton = cn(
    "relative flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors after:absolute after:-inset-1 disabled:opacity-50",
    clair ? "text-white/85 hover:bg-white/15 hover:text-white" : "text-muted-foreground hover:bg-muted active:bg-muted",
  );

  /* Le nom quand on l'a, l'adresse sinon : sur la ligne du haut, celle qu'on
     lit d'abord. */
  const titre = session.name ?? session.email;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href="/comptes"
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2 rounded-lg py-1 pr-2 pl-1 transition-colors",
              clair ? "hover:bg-white/15" : "hover:bg-muted",
            )}
          >
            <Avatar className="size-7">
              {session.avatar && <AvatarImage src={session.avatar} alt="" referrerPolicy="no-referrer" />}
              <AvatarFallback
                className={cn(
                  "text-[11px] font-semibold",
                  clair ? "bg-white/20 text-white" : "bg-muted text-muted-foreground",
                )}
              >
                {initiales(titre)}
              </AvatarFallback>
            </Avatar>
            <span className={cn("min-w-0 flex-1 truncate text-[13px] font-medium", clair ? "text-white" : "text-foreground")}>
              {titre}
            </span>
            <Settings2 className={cn("size-3.5 shrink-0", clair ? "text-white/60" : "text-muted-foreground")} />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="top">{session.email} · Boîtes et espaces</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" onClick={go} disabled={pending} aria-label="Se déconnecter" className={bouton}>
            <LogOut className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">Se déconnecter</TooltipContent>
      </Tooltip>
    </div>
  );
}

/** Une ou deux lettres, jamais plus : c'est un repère, pas une abréviation. */
function initiales(nom: string): string {
  const mots = nom.split(/[\s@.]+/).filter(Boolean);
  return ((mots[0]?.[0] ?? "") + (mots.length > 1 ? (mots[1][0] ?? "") : "")).toUpperCase();
}
