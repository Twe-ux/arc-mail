"use client";

import { useCallback, useEffect, useRef, type CSSProperties } from "react";

import { enrichi, htmlDe, texteDe } from "@/lib/riche";
import { cn } from "@/lib/utils";
import type { ComposeDraft } from "@/lib/types";

/**
 * Le corps du message — **le même champ sur téléphone et sur bureau**.
 *
 * C'était un `<textarea>`, et le panneau de mise en forme avait donc six
 * boutons gris qui disaient pourquoi ils l'étaient. C'est un `contenteditable`
 * : la mise en forme a enfin une destination, et le brouillon garde les deux
 * versions du message — le texte fait foi, le HTML accompagne (`riche.ts`).
 *
 * **Le HTML n'est gardé que s'il apporte quelque chose.** L'éditeur en produit
 * toujours ; un courrier tapé sans mise en forme part donc en texte simple,
 * comme avant. Le HTML ne s'invite pas dans un message qui n'en demandait pas.
 *
 * **Il n'est contrôlé qu'à l'amorce.** Récrire `innerHTML` à chaque frappe
 * replacerait le curseur au début à chaque lettre : le champ est la source, et
 * le store le suit. On ne le repeuple donc que lorsque le brouillon change
 * d'identité — un autre message, une signature ajoutée depuis un panneau — et
 * `dernier` garde ce qu'on a écrit pour ne pas se répondre à soi-même.
 *
 * **Le collage entre en texte simple.** Coller du HTML depuis une page
 * apporterait ses balises, ses styles et ses images distantes dans un message
 * qu'on signe : il faudrait le laver, et le laver appartient au serveur
 * (`html.ts`), pas au champ de saisie.
 */
export function ComposeBody({
  draft,
  update,
  onSend,
  style,
  className,
  ancre,
}: {
  draft: ComposeDraft;
  update: (patch: Partial<ComposeDraft>) => void;
  onSend: () => void;
  style?: CSSProperties;
  className?: string;
  /**
   * Le nœud, **prêté** au panneau de mise en forme : c'est lui qui commande.
   *
   * Un rappel, pas une référence à écrire : un composant ne modifie pas la
   * référence qu'on lui passe — c'est la règle du compilateur React, et elle a
   * raison, une référence partagée en écriture n'a plus de propriétaire.
   */
  ancre: (el: HTMLDivElement | null) => void;
}) {
  const champ = useRef<HTMLDivElement>(null);
  const dernier = useRef<string>("");
  const poser = useCallback(
    (el: HTMLDivElement | null) => {
      champ.current = el;
      ancre(el);
    },
    [ancre],
  );

  /* **Le clavier s'ouvre sur ce qu'on vient écrire.** Un message neuf commence
     par son destinataire ; une réponse, un transfert ou un brouillon rouvert
     l'ont déjà, et c'est le corps qu'on vient remplir. Le curseur se pose **au
     début**, avant la signature et le message cité. */
  const viseCorps = draft.to.length > 0;

  /* **La forme que le brouillon demande au champ**, calculée au même endroit
     par les deux côtés. C'est ce qui rend la comparaison possible : `dernier`
     gardait le HTML **du DOM**, l'effet comparait le HTML **reconstruit**, et
     comme un message sans mise en forme ne garde pas de `html`, les deux ne
     coïncidaient jamais — le champ se récrivait à chaque frappe et le curseur
     repartait au début. La première lettre finissait à la fin du message. */
  useEffect(() => {
    const el = champ.current;
    if (!el) return;
    const voulu = draft.html || htmlDe(draft.body);
    if (voulu === dernier.current) return;
    dernier.current = voulu;
    el.innerHTML = voulu;
  }, [draft.html, draft.body]);

  useEffect(() => {
    if (!viseCorps) return;
    const el = champ.current;
    if (!el) return;
    el.focus();
    const plage = document.createRange();
    plage.setStart(el, 0);
    plage.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(plage);
  }, [viseCorps]);

  const lire = () => {
    const el = champ.current;
    if (!el) return;
    const html = el.innerHTML;
    const texte = texteDe(html);
    const garde = enrichi(html) ? html : undefined;
    /* On retient **ce que l'effet recalculera**, pas ce que le DOM porte : les
       deux doivent être la même chaîne, sinon l'effet croit à un changement
       venu d'ailleurs et repeuple le champ sous les doigts. */
    dernier.current = garde ?? htmlDe(texte);
    update({ body: texte, html: garde });
  };

  return (
    <div
      ref={poser}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      aria-label="Message"
      data-vide={draft.body.length === 0 ? "true" : "false"}
      onInput={lire}
      onBlur={lire}
      onPaste={(e) => {
        e.preventDefault();
        const texte = e.clipboardData.getData("text/plain");
        if (texte) document.execCommand("insertText", false, texte);
      }}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && draft.to.length > 0) onSend();
      }}
      style={style}
      className={cn(
        /* Un plancher, pas `min-h-0` : même sous un panneau, on garde une ligne
           ou deux de ce qu'on est en train d'écrire. */
        /* `none`, pas `contain` : `contain` arrête la page derrière mais laisse
           au champ son propre élastique, et cet élastique court contre la
           transformation du glisser-fermer au moment précis où les deux se
           passent la main — c'est le tremblement (mesuré sur Kairos). */
        "min-h-16 flex-1 overflow-y-auto overscroll-none bg-transparent px-4 py-3.5 outline-none",
        /* L'invite d'un champ riche s'écrit en CSS : il n'a pas de
           `placeholder`, et un `<span>` posé dedans deviendrait du message. */
        "data-[vide=true]:before:pointer-events-none data-[vide=true]:before:absolute data-[vide=true]:before:text-muted-foreground data-[vide=true]:before:content-[attr(data-invite)]",
        "relative",
        className,
      )}
      data-invite="Écris ton message…"
    />
  );
}
