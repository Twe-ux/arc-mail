"use client";

import { useRef } from "react";

import { LISTE_DEFAUT, LISTE_MAX, LISTE_MIN, borne, useMail } from "@/lib/store";

/**
 * La poignée entre la liste et le message : elle déplace la séparation.
 *
 * **La largeur s'écrit sur le nœud pendant le geste, pas dans React.** Une
 * variable CSS (`--list-width`) portée par la coque, réécrite à chaque frame :
 * un `setState` par pixel ferait rendre la liste entière soixante fois par
 * seconde, et la séparation traînerait derrière le doigt. Le store n'apprend le
 * résultat qu'au relâchement — c'est la même règle que les autres gestes de
 * l'app.
 *
 * Elle fait 5 px de trait et 11 px de cible : une séparation trop fine se
 * cherche, une trop épaisse se voit. Et elle répond aux flèches, parce qu'une
 * poignée qu'on ne peut qu'attraper à la souris n'existe pas pour tout le monde.
 */
export function SplitHandle({ coque }: { coque: React.RefObject<HTMLDivElement | null> }) {
  const largeur = useMail((s) => s.listWidth);
  const setLargeur = useMail((s) => s.setListWidth);
  const enCours = useRef(false);

  const poser = (px: number) => coque.current?.style.setProperty("--list-width", `${borne(px)}px`);

  const debut = (e: React.PointerEvent<HTMLDivElement>) => {
    const noeud = coque.current;
    if (!noeud) return;
    enCours.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    /* La liste peut être à droite de la barre latérale comme à gauche : on
       mesure depuis son propre bord, pas depuis celui de la fenêtre. */
    const depart = e.currentTarget.getBoundingClientRect();
    const gauche = depart.left - largeur;
    const bouger = (ev: PointerEvent) => enCours.current && poser(ev.clientX - gauche);
    const fin = (ev: PointerEvent) => {
      enCours.current = false;
      setLargeur(ev.clientX - gauche);
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
      aria-label="Largeur de la liste"
      aria-valuenow={largeur}
      aria-valuemin={LISTE_MIN}
      aria-valuemax={LISTE_MAX}
      tabIndex={0}
      onPointerDown={debut}
      onDoubleClick={() => setLargeur(LISTE_DEFAUT)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") setLargeur(largeur - 16);
        else if (e.key === "ArrowRight") setLargeur(largeur + 16);
        else if (e.key === "Home") setLargeur(LISTE_DEFAUT);
        else return;
        e.preventDefault();
      }}
      /* Le trait est le bord de la liste ; la cible déborde de part et d'autre
         sans pousser personne (`-mx-[3px]`, largeur 11). */
      className="group relative z-10 -mx-[3px] hidden w-[11px] shrink-0 cursor-col-resize touch-none outline-none md:block"
    >
      {/* Le trait ne se montre qu'à l'approche : au repos, la séparation est
          déjà là — c'est le bord de la liste — et un rail permanent ferait une
          troisième ligne verticale à l'écran. */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-[3px] w-[5px] rounded-full bg-[var(--space-accent)] opacity-0 transition-opacity group-hover:opacity-50 group-focus-visible:opacity-100"
      />
    </div>
  );
}
