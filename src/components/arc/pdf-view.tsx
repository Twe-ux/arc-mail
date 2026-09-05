"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Un PDF, dessiné page par page dans des `canvas`.
 *
 * **Pourquoi une bibliothèque plutôt que le lecteur du navigateur.** Une
 * `<iframe src="…​.pdf">` semble suffire, et elle ne suffit pas :
 *
 * - sur iOS — donc dans l'app installée — elle ne montre que la **première
 *   page**, sans défilement ;
 * - le lecteur intégré de Chrome est un module à part qui refuse de démarrer
 *   dans un cadre en bac à sable, or c'est précisément le bac à sable qui rend
 *   acceptable d'afficher le fichier d'un inconnu.
 *
 * pdf.js lit le fichier en JavaScript ordinaire et n'en tire que des pixels :
 * aucun script du document n'est exécuté, aucun formulaire, aucun lien
 * automatique. Le bac à sable reste, et les pages s'affichent.
 *
 * La bibliothèque est **chargée à la demande** : elle pèse plus que le reste de
 * l'app, et la plupart des messages n'ont pas de PDF.
 */

/** Au-delà, on ne dessine pas plus fin : c'est de la mémoire pour rien. */
const ECHELLE_MAX = 2;

export function PdfView({ url, name }: { url: string; name: string }) {
  const hote = useRef<HTMLDivElement>(null);
  const [etat, setEtat] = useState<"chargement" | "prêt" | "erreur">("chargement");
  const [pages, setPages] = useState(0);

  useEffect(() => {
    let vivant = true;
    const noeud = hote.current;
    if (!noeud) return;

    (async () => {
      try {
        /* **La construction « legacy », et la version 4.** La 6 s'appuie sur
           `Map.getOrInsertComputed`, une méthode que ni ce navigateur ni Safari
           iOS ne connaissent : le document s'ouvrait, la première page se
           dessinait, et la seconde levait `getOrInsertComputed is not a
           function`. Trouvé en le mesurant, pas en lisant les notes de version.
           La ligne 4 en construction `legacy` vise des moteurs plus anciens —
           c'est ce qu'il faut pour une app installée sur un téléphone dont on
           ne choisit pas la version. */
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        /* Le fil de travail vient du même paquet : sans lui, pdf.js analyse
           dans le fil principal et l'interface se fige sur un gros document. */
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const doc = await pdfjs.getDocument({ url }).promise;
        if (!vivant) return;
        setPages(doc.numPages);

        /* La largeur disponible décide de l'échelle : un PDF se lit à la
           largeur de sa colonne, pas à sa taille d'impression. */
        const dispo = noeud.clientWidth - 24;
        const densite = Math.min(window.devicePixelRatio || 1, ECHELLE_MAX);

        for (let n = 1; n <= doc.numPages; n += 1) {
          if (!vivant) return;
          const page = await doc.getPage(n);
          const nature = page.getViewport({ scale: 1 });
          const vue = page.getViewport({ scale: (dispo / nature.width) * densite });

          const toile = document.createElement("canvas");
          toile.width = Math.floor(vue.width);
          toile.height = Math.floor(vue.height);
          toile.style.width = "100%";
          toile.style.height = "auto";
          toile.className = "rounded-lg bg-white shadow-sm";
          toile.setAttribute("aria-label", `${name} — page ${n} sur ${doc.numPages}`);
          noeud.append(toile);

          const pinceau = toile.getContext("2d");
          if (!pinceau) continue;
          await page.render({ canvasContext: pinceau, viewport: vue }).promise;
        }
        if (vivant) setEtat("prêt");
      } catch {
        if (vivant) setEtat("erreur");
      }
    })();

    return () => {
      vivant = false;
      noeud.replaceChildren();
    };
  }, [url, name]);

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-black/[0.06] dark:bg-black/40">
      <div ref={hote} className="flex flex-col items-center gap-3 p-3" />
      {etat === "chargement" && (
        <p className="pb-6 text-center text-sm text-muted-foreground">Ouverture du document…</p>
      )}
      {etat === "erreur" && (
        <p className="p-6 text-center text-sm text-muted-foreground">
          Ce document n&apos;a pas pu être ouvert. Il est peut-être protégé, ou abîmé.
        </p>
      )}
      {etat === "prêt" && pages > 1 && (
        <p className="pb-6 text-center text-xs text-muted-foreground">
          {pages} pages
        </p>
      )}
    </div>
  );
}
