"use client";

import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useSession } from "./session";
import { useSignOut } from "./use-sign-out";

/**
 * Le compte connecté, en une seule cible : son visage.
 *
 * Il occupait une **rangée entière** de la barre — visage, nom, engrenage,
 * sortie — juste au-dessus des boîtes, pour deux portes qu'on prend rarement.
 * Le nom y était en double avec l'espace courant juste en dessous, et les deux
 * icônes muettes demandaient une infobulle chacune pour dire où elles menaient.
 *
 * L'avatar seul, dans la rangée du bas, avec ses deux portes **dans un menu**.
 * C'est la convention de toutes les apps qui ont un compte, et elle rend une
 * ligne de 32 px à la liste des dossiers.
 *
 * `Popover` avec un `role="menu"` plutôt qu'un `DropdownMenu` : le registre
 * shadcn n'est pas joignable depuis cet environnement, et le dépôt a déjà ce
 * motif (le menu du `⋯` du composeur). Une primitive de moins à tenir.
 *
 * Ne rend rien quand personne n'est connecté — c'est-à-dire tant que Supabase
 * n'est pas configuré, où l'app reste la maquette ouverte d'aujourd'hui.
 */
export function AccountMenu({ className }: { className?: string }) {
  const session = useSession();
  const { partir, enCours } = useSignOut();
  const [open, setOpen] = useState(false);
  if (!session) return null;

  const titre = session.name ?? session.email;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Compte de ${titre}`}
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                className,
              )}
            >
              <Avatar className="size-7">
                {session.avatar && <AvatarImage src={session.avatar} alt="" referrerPolicy="no-referrer" />}
                <AvatarFallback className="bg-[var(--side-fill-active)] text-[11px] font-semibold text-[var(--side-ink)]">
                  {initiales(titre)}
                </AvatarFallback>
              </Avatar>
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">{session.email}</TooltipContent>
      </Tooltip>

      {/* **Le même rectangle que le panneau d'apparence, à côté.** Les deux
          portes du bas de la barre s'ouvrent au même endroit, à la même
          largeur : 260 px — la largeur de la barre —, alignées par leur fin et
          reposées à 8 px du bord (`collisionPadding`, la marge `px-2` de la
          barre elle-même). Sans ces deux valeurs, le menu du compte tombait à
          4 px du bord en barre attachée et à 0 en rail, pendant que le panneau
          se posait à 8 : deux cartes issues de deux boutons voisins, décalées
          l'une de l'autre sans qu'aucune raison ne le dise. */}
      <PopoverContent
        align="end"
        side="top"
        sideOffset={8}
        collisionPadding={8}
        className="w-[260px] overflow-hidden p-0"
      >
        {/* Le visage et le nom **dans** le menu : sans eux, deux entrées
            nues ne diraient pas de quel compte on parle — et c'est justement
            la question que pose quelqu'un qui en a deux. */}
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <Avatar className="size-8">
            {session.avatar && <AvatarImage src={session.avatar} alt="" referrerPolicy="no-referrer" />}
            <AvatarFallback className="bg-muted text-[11px] font-semibold text-muted-foreground">
              {initiales(titre)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{titre}</p>
            <p className="truncate text-xs text-muted-foreground">{session.email}</p>
          </div>
        </div>

        <div role="menu" aria-label="Compte" className="border-t border-black/[0.07] dark:border-white/[0.08]">
          <Link
            href="/comptes"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex h-10 items-center gap-2.5 px-3 text-sm transition-colors hover:bg-muted"
          >
            <UserRound className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
            Comptes et signatures
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={partir}
            disabled={enCours}
            className="flex h-10 w-full items-center gap-2.5 px-3 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50"
          >
            <LogOut className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
            Se déconnecter
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Une ou deux lettres, jamais plus : c'est un repère, pas une abréviation. */
function initiales(nom: string): string {
  const mots = nom.split(/[\s@.]+/).filter(Boolean);
  return ((mots[0]?.[0] ?? "") + (mots.length > 1 ? (mots[1][0] ?? "") : "")).toUpperCase();
}
