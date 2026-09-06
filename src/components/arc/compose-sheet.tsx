"use client";

import { ArrowUp, MoreHorizontal, Paperclip, Type, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSheetDismiss } from "@/hooks/use-sheet-dismiss";
import { useMail } from "@/lib/store";
import type { ComposeDraft } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AttachmentChips, AttachPanel } from "./compose-attach";
import { ComposeFields, SendFailed } from "./compose-fields";
import { DraftMenu, FormatPanel } from "./compose-panels";
import { useComposeTools } from "./use-compose-tools";

/**
 * Le composeur sur téléphone : **une feuille plein écran**, celle de Mail
 * d'iOS.
 *
 * Elle a été une carte flottante à 8 px des quatre côtés pendant deux
 * versions. Sur l'écran le plus contraint de l'app — 441 px de haut clavier
 * sorti — ces marges coûtaient 16 px de large et 16 de haut pour dire
 * « fenêtre », alors qu'écrire un message est le seul moment où l'app n'est
 * plus une boîte mais un éditeur. La feuille part donc du bord haut sûr,
 * touche les trois autres bords, et n'arrondit que ses coins hauts. La règle
 * des 8 px de [cartes flottantes](../../../docs/features/cartes-flottantes.md)
 * vaut toujours pour le menu et la recherche, qui se posent *par-dessus* la
 * boîte ; celle-ci la remplace.
 *
 * ```
 * ────  poignée : le glisser-fermer existait, rien ne le disait
 * (✕)       Nouveau message              (↑)   56  le bandeau, et rien d'autre
 * À       …                                    44
 * Cc/Cci · De thierry@icloud.com                44
 * Objet                                        44
 * le message                                   ↕   seul défilant
 * 📎  Aa                                  ⋯    55  outils, à plat
 * ```
 *
 * **La feuille est ancrée, pas calée sur le viewport visuel** : haut à
 * l'encoche, bas au bord, et le clavier n'ajoute qu'un `padding-bottom`. La
 * mécanique vient de Kairos ; s'en écarter avait coûté deux défauts, la page
 * qui monte derrière et les flashs à l'ouverture.
 *
 * **Pas de grand titre.** La feuille d'iOS pose son nom en 30 px sur une ligne
 * à lui : c'est elle qu'on reconnaissait, et elle coûtait 41 px au repos. Le
 * nom tient au centre du bandeau, et ce qui rattache la feuille à Arc Mail est
 * le **voile teinté de l'espace** qui la coiffe, pas un titre de système.
 *
 * **L'envoi est en haut à droite**, où Mail d'iOS le met — arbitrage contre la
 * version du 5 septembre qui l'avait descendu « là où le pouce est » : clavier
 * sorti, le pouce est sur les touches, et un disque de 56 px coûtait une barre
 * entière pour une seule action. La barre du bas devient ce qu'iOS en fait :
 * les outils d'écriture, juste au-dessus du clavier, à plat contre le bord.
 */
export function ComposeSheet({ draft }: { draft: ComposeDraft | null }) {
  const closeCompose = useMail((s) => s.closeCompose);
  const sendMail = useMail((s) => s.sendMail);
  const sendError = useMail((s) => s.sendError);
  const update = useMail((s) => s.updateCompose);
  const deleteDraft = useMail((s) => s.deleteDraft);
  const canSend = (draft?.to.length ?? 0) > 0;
  const titre =
    draft?.subject.trim() || (draft?.draftId ? "Brouillon" : "Nouveau message");
  const sheetRef = useSheetDismiss(closeCompose);
  const t = useComposeTools(draft);
  /* **Un champ a-t-il le focus ?** C'est notre seule façon de savoir que le
     clavier tient l'écran — `--keyboard-inset` vaut zéro en app installée. Les
     événements de focus remontent, une capture sur la feuille suffit, et on ne
     retient que les champs : un bouton d'outil qui prend le focus ne lève
     aucun clavier. */
  const [champVise, setChampVise] = useState(false);

  return (
    <Sheet
      open={draft !== null}
      onOpenChange={(open) => {
        if (!open) closeCompose();
      }}
    >
      {/* The same primitive as the menu, so the same motion: one card that
          rises from the bottom, not a dialog that also zooms and fades. */}
      <SheetContent
        ref={sheetRef}
        side="bottom"
        showCloseButton={false}
        onFocusCapture={(e) =>
          setChampVise(e.target instanceof HTMLElement && /^(INPUT|TEXTAREA)$/.test(e.target.tagName))
        }
        onBlurCapture={() => setChampVise(false)}
        /* This sheet already has three explicit ways to close: Fermer, the
           swipe-down gesture, sending. Radix's own default — a pointerdown
           outside the content also closes it — is one more, undeclared one,
           and it fires from a raw `pointerdown` before our gesture code ever
           sees the touch: a drag that starts on the card is judged "inside"
           at that first pointerdown regardless of where it travels, but the
           very next tap (the one right after a small drag settles back) can
           land on the sliver of page around the card's rounded corners and
           silently dismiss it — no swipe involved, nothing our own code
           could have caught. */
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        /* **La feuille ne bouge pas ; c'est un coussin qui grandit.** C'est la
           mécanique de Kairos, et on y revient après deux versions passées à
           la caler sur le rectangle visible (`--vv-top` / `--vv-height`).

           Une feuille dont la hauteur suit le viewport visuel se redessine à
           chaque frame où le navigateur bouge le sien — et il en bouge un au
           mauvais moment : **ouvrir un dialogue verrouille le défilement de la
           page, WebKit re-résout alors le viewport en app installée**, et
           l'écart entre les deux viewports saute d'une cinquantaine de pixels
           qui n'ont rien d'un clavier. La feuille prenait une hauteur, puis
           une autre, la page réapparaissait derrière : les « flashs » signalés
           à l'ouverture.

           Elle est donc **ancrée** — haut à l'encoche, bas au bord — et c'est
           son `padding-bottom` qui prend la hauteur du clavier. Le champ visé
           se retrouve au-dessus des touches sans que rien ne se déplace, donc
           le navigateur n'a jamais à faire défiler le document pour le
           révéler : c'est aussi ce qui règle « l'écran derrière se lève ».

           **La marge du haut rattrape le décalage du navigateur.** Poser le
           curseur dans le message fait glisser le viewport **visuel** de
           quelques pixels — iOS révèle le champ visé, dont le bas passe sous
           les touches le temps que le coussin arrive — et une feuille `fixed`,
           posée dans le viewport de *mise en page*, apparaît décalée d'autant
           vers le haut : la carte « remontait un peu ». `--vv-top` lui rend
           ces pixels. C'est une **marge**, jamais une hauteur : `--vv-height`
           ne revient pas, c'est lui qui faisait les flashs.

           **Les deux marges, pas une.** N'ajouter le décalage qu'en haut
           remettait la tête en place et laissait le bas où il était : la barre
           d'outils apparaissait d'autant plus haut au-dessus des touches, et
           elle ne tombait pas au même endroit selon le champ visé — le corps
           décale, « À » presque pas. La marge du bas est donc son opposé : la
           feuille entière descend de `--vv-top`, sa hauteur ne change pas, et
           elle se repose exactement là où le navigateur l'aurait posée sans
           décaler. Ce qui dépasse sous le viewport est sous les touches.

           **Le haut est un `top: 0` et une marge**, pas un `top: var(…)`.
           Signalé : « à la première ouverture la page est trop grande, du coup
           on ne voit pas le haut ». Une position qui dépend d'une variable
           peut ne pas résoudre ; une marge sur un `top: 0` ne le peut pas — au
           pire la feuille commence au bord de l'écran, jamais au-dessus.
           `max-h-[100svh]` en second garde-fou : `svh` est le viewport qui ne
           bouge pas, celui que WebKit ne re-résout pas sous nos pieds.

           **Et elle n'entre plus de tout en bas.** Le glissement de 100 % la
           posait à 800 px de sa place pendant 400 ms, or c'est là que le champ
           « À » prend le focus : iOS décalait le viewport visuel pour révéler
           un champ qui était encore en bas de l'écran, et la feuille — qui est
           `fixed`, donc posée dans le viewport de mise en page — se retrouvait
           dessinée d'autant trop haut, tête coupée. Elle monte maintenant de
           32 px en 300 ms : le champ visé est à sa place dès la première
           frame, le navigateur n'a rien à révéler. C'est un **écart assumé** à
           la recette d'entrée des cartes (400 ms, glissement plein) ; une
           feuille plein écran qui traverse l'écran n'a pas les mêmes
           contraintes qu'une carte de 400 px.

           **Le coussin vaut zéro en app installée, et c'est voulu** : iOS y
           rétrécit *aussi* le viewport de mise en page, donc `bottom: 0`
           s'arrête déjà au-dessus des touches. `--keyboard-inset` mesure ce
           que ce viewport ne compense pas (`innerHeight − visualViewport`, la
           mesure de Kairos) : zéro ici, la hauteur du clavier dans un
           navigateur ordinaire. L'ajouter quand même comptait le clavier deux
           fois — la tête de la feuille sortait par le haut, une bande blanche
           restait en bas.

           **Et le coussin ne s'applique que si un champ a le focus**
           (`:has(:is(input,textarea):focus)`) : sans cette garde, les 50 px
           fantômes de la re-résolution poussaient la tête de la feuille puis
           la lâchaient. Pas de champ visé, pas de clavier, pas de coussin.

           La garde est posée **une fois**, sur `--clavier` : la feuille en
           prend son coussin, et la barre du bas en retire l'encoche. Deux
           lecteurs de la même mesure, une seule condition — sinon la barre
           rendait ses 34 px pendant le fantôme et sautait de 26 px à
           l'ouverture. */
        className="inset-x-0 top-0 bottom-0 mt-[calc(var(--safe-top)+var(--vv-top,0px))] mb-[calc(0px-var(--vv-top,0px))] flex h-auto max-h-[100svh] w-auto max-w-none flex-col gap-0 rounded-t-[36px] border-0 p-0 pb-[var(--clavier)] shadow-[0_-8px_40px_rgb(0_0_0/0.28)] transition-none data-[state=open]:slide-in-from-bottom-8 data-[state=open]:duration-300 [--bas:max(0.5rem,calc(env(safe-area-inset-bottom)-12px))] [--clavier:0px] [&:has(:is(input,textarea):focus)]:[--bas:0.375rem] [&:has(:is(input,textarea):focus)]:[--clavier:var(--keyboard-inset,0px)] dark:bg-[#26262a] dark:ring-1 dark:ring-white/12"
      >
        {/* Le voile de l'espace, en haut de la feuille et lui seul : c'est ce
            qui la rattache à Arc Mail plutôt qu'à la feuille grise d'iOS.

            C'est **la couleur du voile de la boîte** (`--wash-compose`, réglée
            avec les autres doses du voile), d'un bord à l'autre, que l'on
            efface vers le bas au masque. Le dégradé de l'espace en balaie trois
            teintes sur 80° : posé ici il donnait du rose là où la réception
            donne de la lavande, et la feuille n'avait pas l'air de venir de la
            même boîte. Un halo radial, lui, laissait le côté droit gris — la
            couleur ne traversait pas. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-36 rounded-t-[36px] [background:color-mix(in_oklch,var(--space-accent)_var(--wash-compose),transparent)] [mask-image:linear-gradient(to_bottom,#000,transparent)]"
        />
        {/* La poignée : le glisser-fermer existe depuis le lot mobile, et rien
            ne le disait. Sur une feuille qui touche les bords, c'est elle qui
            annonce qu'on peut la faire redescendre. */}
        <span
          aria-hidden
          className="relative mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-foreground/15 dark:bg-white/20"
        />
        <header className="relative flex h-14 shrink-0 items-center gap-2 px-4">
          {/* « Fermer », pas « Annuler » : fermer garde le texte en brouillon,
              et en français comme sur iOS « Annuler » promet de le jeter. */}
          <RoundCase label="Fermer (brouillon conservé)" onClick={closeCompose}>
            <X strokeWidth={2} />
          </RoundCase>
          {/* **Un bandeau, pas un grand titre.** La feuille d'iOS pose son nom
              en 30 px sur une ligne à lui : c'est elle qu'on reconnaissait, et
              elle coûtait 41 px au repos. Le nom tient au centre du bandeau,
              seul — la tuile de l'espace a été essayée là et retirée : le voile
              teinté dit déjà la boîte, et la ligne repliée en donne l'adresse.
              Deux fois la même chose sur 393 px, c'est une fois de trop. */}
          {/* **L'objet prend la place du nom dès qu'on l'écrit** — comme la
              fenêtre du bureau, et comme un onglet d'Arc : le bandeau dit ce
              qu'on écrit, pas la catégorie de ce qu'on écrit. */}
          <SheetTitle className="min-w-0 flex-1 truncate text-center text-[15px] font-semibold tracking-[-0.01em]">
            {titre}
          </SheetTitle>
          <SheetDescription className="sr-only">Rédiger un e-mail</SheetDescription>
          <RoundCase
            label={sendError ? "Réessayer l’envoi" : "Envoyer"}
            disabled={!canSend}
            envoi
            onClick={sendMail}
          >
            <ArrowUp strokeWidth={2.5} />
          </RoundCase>
        </header>

        {sendError && <SendFailed detail={sendError} />}
        {draft && (
          <ComposeFields
            key={draft.draftId ?? "new"}
            draft={draft}
            compact
            lignesCachees={t.panneau !== null && champVise}
            bodyStyle={{
              fontSize: t.taille,
              fontFamily: t.serif ? "ui-serif, Georgia, serif" : undefined,
            }}
          />
        )}

        <AttachmentChips attachments={t.pieces} onRemove={t.retirer} />

        {t.panneau === "pieces" && (
          <AttachPanel
            onClose={() => t.setPanneau(null)}
            onFiles={(files) => void t.joindre(files)}
            hasSignature={Boolean(t.espace?.signature)}
            onSignature={t.signer}
          />
        )}
        {t.panneau === "forme" && (
          <FormatPanel
            onClose={() => t.setPanneau(null)}
            size={t.taille}
            onSize={t.setTaille}
            serif={t.serif}
            onSerif={t.setSerif}
          />
        )}

        {/* **À plat contre le bord**, pas une pill qui flotte. Le verre de la
            pill dit « posé par-dessus ce qui défile » ; ici rien ne défile
            dessous — c'est le bord de la feuille, et juste au-dessus du
            clavier.

            Le coussin du bas (`--bas`) est l'encoche **moins 12 px** — la
            barre est déjà une cible de 40, l'indicateur d'accueil n'a pas
            besoin des 34 en entier — et **6 px quand un champ a le focus** :
            la feuille s'arrête alors sur les touches, où le moindre vide se
            lit comme un trou. Il se décide sur le focus et non sur
            `--keyboard-inset`, qui vaut zéro en app installée. */}
        <div className="relative shrink-0">
          {t.menu && draft && (
            <DraftMenu
              hasSignature={Boolean(t.espace?.signature)}
              onSignature={t.signer}
              /* Ancré sur la case qui l'ouvre, et non posé à 8 px des trois
                 bords : sur une feuille qui touche déjà l'écran, son coin bas
                 s'y faisait couper. */
              className="absolute right-2 bottom-full mb-2 w-[min(19rem,calc(100%-1rem))]"
              /* « Enregistrer » **est** la fermeture : `closeCompose` range déjà
                 le brouillon par le fournisseur. Deux chemins pour la même
                 écriture auraient fini par diverger. */
              onSave={() => {
                t.setMenu(false);
                closeCompose();
                toast("Brouillon enregistré");
              }}
              /* Supprimer un brouillon déjà rangé passe par le fournisseur ; un
                 message jamais enregistré se jette en le vidant — `closeCompose`
                 ne range alors rien (`isBlank`). */
              onDelete={() => {
                t.setMenu(false);
                if (draft.draftId) {
                  deleteDraft(draft.draftId);
                } else {
                  update({ to: [], cc: [], bcc: [], subject: "", body: "", attachments: [] });
                  closeCompose();
                }
                toast("Brouillon supprimé");
              }}
            />
          )}
          <footer className="relative z-20 flex items-center gap-1 border-t border-black/[0.06] bg-background px-2.5 pt-1.5 pb-[var(--bas)] dark:border-white/[0.08] dark:bg-[#26262a]">
            <ToolCase
              label="Pièce jointe"
              active={t.panneau === "pieces"}
              onClick={() => t.basculer("pieces")}
            >
              <Paperclip strokeWidth={1.75} />
            </ToolCase>
            <ToolCase
              label="Mise en forme"
              active={t.panneau === "forme"}
              onClick={() => t.basculer("forme")}
            >
              <Type strokeWidth={1.75} />
            </ToolCase>
            <span className="flex-1" />
            <ToolCase label="Options du brouillon" active={t.menu} onClick={t.ouvrirMenu}>
              <MoreHorizontal strokeWidth={1.75} />
            </ToolCase>
          </footer>
        </div>

        {/* Le voile du menu appartient à la feuille, pas au menu : c'est elle
            qu'il doit couvrir en entier, et c'est la sortie la plus large
            qu'un menu posé par-dessus puisse offrir. */}
        {t.menu && (
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => t.setMenu(false)}
            className="absolute inset-0 z-10 rounded-t-[36px] bg-black/40 animate-in fade-in-0 duration-200"
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

/**
 * Les deux cases rondes du bandeau : fermer à gauche, envoyer à droite.
 *
 * 44 px — la cible d'Apple, sans le disque de 56 qui coûtait une barre. Seul
 * l'envoi porte le dégradé de l'espace : c'est l'action, et c'est la règle du
 * thème. Fermer reste une case de verre, comme sur la feuille d'iOS.
 */
function RoundCase({
  label,
  envoi,
  disabled,
  onClick,
  children,
}: {
  label: string;
  envoi?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full transition-[transform,opacity] active:scale-90 active:duration-0 disabled:opacity-35 [&_svg]:size-[21px]",
        envoi
          ? "text-white shadow-[0_4px_14px_rgb(0_0_0/0.22)] disabled:shadow-none [background:var(--space-gradient)]"
          : "bg-black/[0.06] text-foreground dark:bg-white/[0.10]",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Une case de la rangée d'outils : 40 px, ronde, l'état actif **se remplit**.
 *
 * La règle du thème s'applique ici comme dans la pill : l'accent est un fond,
 * jamais une encre, et le texte qui le surmonte lit `--space-ink`.
 */
function ToolCase({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full transition-[background-color,color,transform] duration-200 active:scale-90 active:duration-0 [&_svg]:size-[21px]",
        active
          ? "bg-[color-mix(in_oklch,var(--space-accent)_22%,transparent)] text-[var(--space-ink)]"
          : "text-muted-foreground active:bg-black/[0.06] active:text-foreground dark:active:bg-white/[0.08]",
      )}
    >
      {children}
    </button>
  );
}
