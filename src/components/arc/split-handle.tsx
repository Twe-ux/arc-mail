"use client";

import { useRef } from "react";

import {
  LECTURE_MIN,
  LISTE_DEFAUT,
  LISTE_MIN,
  TIERS_MIN,
  useMail,
} from "@/lib/store";

/**
 * La séparation entre la liste et la conversation.
 *
 * **La largeur s'écrit sur le nœud pendant le geste, pas dans React.** Une
 * variable CSS (`--list-width`) portée par la coque, réécrite à chaque frame :
 * un `setState` par pixel ferait rendre la liste entière soixante fois par
 * seconde, et la séparation traînerait derrière le doigt. Le store n'apprend le
 * résultat qu'au relâchement — c'est la règle des autres gestes de l'app.
 *
 * Elle est une **piste de grille de 11 px**, pas une bordure débordante : la
 * fenêtre est une grille à pistes explicites, et un enfant qui déborderait de
 * la sienne ferait mentir toutes les mesures. Le trait, lui, fait 1 px et ne
 * s'épaissit qu'à l'approche : au repos la séparation est déjà là.
 *
 * Les bornes sont mesurées sur la fenêtre réelle, jamais supposées : 300 px au
 * moins pour la liste, et **420 px garantis à la conversation** — c'est la
 * largeur en dessous de laquelle on lit trois mots par ligne.
 */
export function SplitHandle({ coque }: { coque: React.RefObject<HTMLDivElement | null> }) {
  const largeur = useMail((s) => s.listWidth);
  const setLargeur = useMail((s) => s.setListWidth);
  const troisieme = useMail((s) => s.third);
  const tiers = useMail((s) => s.thirdWidth);
  const enCours = useRef(false);

  /* Ce qui reste à la conversation dépend de ce qui l'entoure : la poignée
     elle-même, la gouttière et le troisième volet quand il est là. */
  const pris = () => 11 + (troisieme ? 16 + tiers : 0);
  const maxi = (fenetre: number) => Math.max(LISTE_MIN, fenetre - pris() - LECTURE_MIN);
  const borner = (px: number, fenetre: number) => Math.round(Math.min(maxi(fenetre), Math.max(LISTE_MIN, px)));

  const poser = (px: number, fenetre: number) =>
    coque.current?.style.setProperty("--list-width", `${borner(px, fenetre)}px`);

  const debut = (e: React.PointerEvent<HTMLDivElement>) => {
    const noeud = coque.current;
    if (!noeud) return;
    enCours.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    /* La liste peut être à droite de la barre latérale comme à gauche : on
       mesure depuis son propre bord, pas depuis celui de la fenêtre. */
    const depart = e.currentTarget.getBoundingClientRect();
    const gauche = depart.left - largeur;
    const fenetre = noeud.getBoundingClientRect().width;
    const bouger = (ev: PointerEvent) => enCours.current && poser(ev.clientX - gauche, fenetre);
    const fin = (ev: PointerEvent) => {
      enCours.current = false;
      setLargeur(borner(ev.clientX - gauche, fenetre));
      window.removeEventListener("pointermove", bouger);
      window.removeEventListener("pointerup", fin);
    };
    window.addEventListener("pointermove", bouger);
    window.addEventListener("pointerup", fin);
  };

  /* 50/50 **sur la largeur réelle**, gouttière mesurée et non supposée : le
     double-clic doit tomber au milieu de ce qu'on voit, pas d'un chiffre
     écrit une fois pour toutes. */
  const moitie = () => {
    const noeud = coque.current;
    if (!noeud) return setLargeur(LISTE_DEFAUT);
    const fenetre = noeud.getBoundingClientRect().width;
    setLargeur(borner((fenetre - pris()) / 2, fenetre));
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Largeur de la liste"
      aria-valuenow={largeur}
      aria-valuemin={LISTE_MIN}
      tabIndex={0}
      onPointerDown={debut}
      onDoubleClick={moitie}
      onKeyDown={(e) => {
        const fenetre = coque.current?.getBoundingClientRect().width ?? 1440;
        if (e.key === "ArrowLeft") setLargeur(borner(largeur - 16, fenetre));
        else if (e.key === "ArrowRight") setLargeur(borner(largeur + 16, fenetre));
        else if (e.key === "Home") moitie();
        else return;
        e.preventDefault();
      }}
      className="group relative hidden w-[11px] cursor-col-resize touch-none outline-none has-[:active]:bg-[color-mix(in_oklch,var(--space-accent)_12%,transparent)] hover:bg-[color-mix(in_oklch,var(--space-accent)_12%,transparent)] md:col-start-2 md:row-start-1 md:block"
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-[5px] w-px bg-black/[0.08] transition-[background-color,width] group-hover:w-0.5 group-hover:bg-[color-mix(in_oklch,var(--space-accent)_60%,transparent)] group-focus-visible:w-0.5 group-focus-visible:bg-[var(--space-accent)] dark:bg-white/10"
      />
    </div>
  );
}

/**
 * La poignée du troisième volet, dans la gouttière de dégradé.
 *
 * **Le sens est inversé** : elle est à gauche du volet, mais c'est le bord
 * droit qui bouge — tirer vers la gauche l'élargit. Et la gouttière fait
 * 16 px de dégradé, pas un filet : c'est elle qui dit « cette fenêtre-là est
 * autre chose », là où le filet interne dit « ces deux colonnes sont la même
 * vue ».
 */
export function ThirdHandle({ coque }: { coque: React.RefObject<HTMLDivElement | null> }) {
  const largeur = useMail((s) => s.thirdWidth);
  const setLargeur = useMail((s) => s.setThirdWidth);
  const liste = useMail((s) => s.listWidth);
  const enCours = useRef(false);

  const borner = (px: number, fenetre: number) =>
    Math.round(Math.min(Math.max(TIERS_MIN, fenetre - liste - 11 - 16 - LECTURE_MIN), Math.max(TIERS_MIN, px)));

  const debut = (e: React.PointerEvent<HTMLDivElement>) => {
    const noeud = coque.current;
    if (!noeud) return;
    enCours.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const boite = noeud.getBoundingClientRect();
    /* Le bord droit du volet ne bouge pas : sa largeur est la distance entre
       le pointeur et lui. */
    const droite = boite.right;
    const bouger = (ev: PointerEvent) => {
      if (!enCours.current) return;
      coque.current?.style.setProperty("--third-width", `${borner(droite - ev.clientX - 16, boite.width)}px`);
    };
    const fin = (ev: PointerEvent) => {
      enCours.current = false;
      setLargeur(borner(droite - ev.clientX - 16, boite.width));
      window.removeEventListener("pointermove", bouger);
      window.removeEventListener("pointerup", fin);
    };
    window.addEventListener("pointermove", bouger);
    window.addEventListener("pointerup", fin);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Largeur du volet"
      aria-valuenow={largeur}
      aria-valuemin={TIERS_MIN}
      tabIndex={0}
      onPointerDown={debut}
      onKeyDown={(e) => {
        const fenetre = coque.current?.getBoundingClientRect().width ?? 1440;
        if (e.key === "ArrowLeft") setLargeur(borner(largeur + 16, fenetre));
        else if (e.key === "ArrowRight") setLargeur(borner(largeur - 16, fenetre));
        else return;
        e.preventDefault();
      }}
      /* `-mx-2` mange les deux gouttières de 8 px de la coque : la bande de
         dégradé fait alors les 16 px que `pris()` compte, et non 32. */
      className="group -mx-2 hidden w-4 shrink-0 cursor-col-resize touch-none place-items-center outline-none md:grid"
    >
      <span
        aria-hidden
        className="h-11 w-[5px] rounded-full bg-white/[0.32] transition-[height,background-color] group-hover:h-[72px] group-hover:bg-[var(--space-accent)] group-focus-visible:h-[72px] group-focus-visible:bg-[var(--space-accent)]"
      />
    </div>
  );
}
