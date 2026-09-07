"use client";

import { useState } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";

import { useMail } from "@/lib/store";
import type { ComposeDraft } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ComposeCorps, HeaderButton } from "./compose-corps";

/**
 * **760 × 560, au centre.** Elle a été une colonne à droite du message pendant
 * une version : côte à côte, on voyait ce à quoi on répond. Mais écrire n'est
 * pas lire — la colonne prenait sa largeur sur la conversation, se disputait la
 * place avec le troisième volet, et n'avait ni coin ni ombre pour dire qu'elle
 * était autre chose. La fenêtre du handoff est revenue, et elle est posée sur
 * la boîte : elle ne prend aucune piste de la grille.
 *
 * **Sa barre du bas fait maintenant quelque chose.** Elle portait quatre
 * icônes grises — trombone, image, émoji, lien — désactivées « en attendant le
 * dos » : le trombone, lui, avait un dos depuis le 5 septembre, sur téléphone.
 * On pouvait joindre un fichier avec le pouce et pas avec une souris. Il est
 * vivant, la signature aussi, et **le glisser-déposer** entre par la fenêtre
 * entière. Les trois autres sont parties : trois boutons éteints à demeure ne
 * sont pas une promesse, c'est du bruit.
 */
export function ComposeWindow({ draft }: { draft: ComposeDraft }) {
  const closeCompose = useMail((s) => s.closeCompose);
  /* Plus de « réduit » : une fenêtre réduite est une fenêtre qu'on a oubliée.
     Fermer garde le brouillon, ce que « réduire » ne faisait que reporter. */
  const [grande, setGrande] = useState(false);
  const title = draft.subject.trim() || (draft.draftId ? "Brouillon" : "Nouveau message");

  return (
    <div
      /* Le voile pose la fenêtre au-dessus de la boîte sans la cacher. Un clic
         dessus ne ferme pas — comme les cartes du téléphone : on ne perd pas un
         message en cours parce que le pointeur a glissé. Il ne fait que rendre
         sa taille à une fenêtre agrandie. */
      className="fixed inset-0 z-50 hidden place-items-center bg-black/35 backdrop-blur-[2px] animate-in fade-in-0 sm:grid"
      onClick={(e) => e.target === e.currentTarget && grande && setGrande(false)}
    >
      <section
        role="dialog"
        aria-label={title}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            closeCompose();
          }
        }}
        className={cn(
          /* Colonne flexible, et `ComposeFields` porte `min-h-0 flex-1` : c'est
             ce qui l'étire au lieu de la laisser se dimensionner sur son
             contenu — le piège que le handoff signale pour les grilles. */
          "relative flex flex-col overflow-hidden rounded-2xl bg-card text-card-foreground",
          "shadow-[0_40px_90px_-10px_rgb(0_0_0/0.55)] ring-1 ring-black/10 animate-in fade-in-0 zoom-in-95 duration-200 dark:ring-white/14",
          grande
            ? "h-[min(860px,calc(100vh-4rem))] w-[min(1000px,calc(100vw-4rem))]"
            : "h-[min(560px,calc(100vh-4rem))] w-[min(760px,calc(100vw-4rem))]",
        )}
      >
        {/* **Discret.** Il portait le dégradé de l'espace : sur 760 px de large
            la bande de couleur pesait plus que le message qu'on venait écrire,
            et elle disait « fenêtre système » là où le reste de l'app est en
            surfaces neutres. Un filet et un titre suffisent ; la couleur de
            l'espace reste sur l'action, le bouton d'envoi. */}
        <header
          className="flex shrink-0 cursor-default items-center gap-1 border-b border-black/[0.07] px-3.5 py-3 dark:border-white/10"
          onDoubleClick={() => setGrande((g) => !g)}
        >
          <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold">{title}</h2>
          <HeaderButton
            label={grande ? "Réduire la fenêtre" : "Agrandir la fenêtre"}
            onClick={() => setGrande((g) => !g)}
          >
            {grande ? <Minimize2 /> : <Maximize2 />}
          </HeaderButton>
          <HeaderButton label="Fermer (brouillon conservé)" onClick={closeCompose}>
            <X />
          </HeaderButton>
        </header>

        <ComposeCorps draft={draft} />

      </section>
    </div>
  );
}
