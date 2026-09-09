"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  allumerPush,
  eteindrePush,
  etatPush,
  installee,
  pushPossible,
  surIphone,
  type EtatPush,
} from "@/lib/push/client";
import { Segmented } from "./segmented";

/**
 * **Le contrôle des notifications, une seule définition pour les deux
 * surfaces** — la feuille du téléphone et le panneau d'apparence du bureau,
 * qui disent la même chose avec les mêmes mots.
 *
 * Quatre états, pas un interrupteur : sur iPhone hors app installée l'API
 * n'existe pas, et une case qu'on ne peut pas lever ment. Un refus système ne
 * se rattrape pas non plus depuis une page — on le dit, on ne le retente pas.
 */
export function usePush() {
  const [etat, setEtat] = useState<EtatPush>("inconnu");
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    let vivant = true;
    const lire = () => {
      void etatPush().then((e) => {
        if (vivant) setEtat(e);
      });
    };
    lire();
    /* Le worker peut n'être pas encore prêt au premier chargement : `ready` se
       résout quand il l'est, et la ligne se corrige d'elle-même. Il ne se
       résout jamais s'il n'y en a pas — c'est sans conséquence ici, rien
       n'attend après lui. */
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator)
      void navigator.serviceWorker.ready.then(lire).catch(() => {});
    return () => {
      vivant = false;
    };
  }, []);

  const basculer = useCallback(
    async (allumer: boolean) => {
      setEnCours(true);
      try {
        setEtat(allumer ? await allumerPush() : await eteindrePush());
      } catch (error) {
        setEtat(await etatPush());
        toast.error("Notifications", {
          description: error instanceof Error ? error.message : "Impossible pour le moment.",
        });
      } finally {
        setEnCours(false);
      }
    },
    [],
  );

  return { etat, enCours, basculer };
}

/**
 * Ce qui remplace le contrôle quand il n'y a rien à basculer.
 *
 * « Dans l'app installée » est la phrase qui compte : c'est la seule condition
 * qu'une personne peut lever elle-même, et sans elle un iPhone n'affiche
 * jamais de notification web.
 */
export function motPush(etat: EtatPush): string | null {
  if (etat === "refuse") return "Refusées par le système";
  if (etat === "sans-worker") return "Pas encore prêt";
  if (etat !== "impossible") return null;
  /* Trois empêchements, trois phrases : celle qui compte est la première —
     c'est la seule qu'une personne peut lever elle-même. */
  if (surIphone() && !installee()) return "Dans l'app installée";
  if (!pushPossible()) return "Pas sur ce navigateur";
  return "Non configuré";
}

export function PushControl({ size }: { size?: "sm" }) {
  const { etat, enCours, basculer } = usePush();
  const mot = motPush(etat);

  /* Tant qu'on ne sait pas, on ne dit rien : un segmenté posé sur
     « Désactivées » avant la lecture annoncerait un état qu'on n'a pas lu. */
  if (etat === "inconnu") return null;
  if (mot)
    return <span className="shrink-0 text-[13px] text-muted-foreground">{mot}</span>;

  return (
    <Segmented
      size={size}
      label="Notifications"
      options={[
        ["oui", "Activées"],
        ["non", "Désactivées"],
      ]}
      value={etat === "allume" ? "oui" : "non"}
      onChange={(v) => {
        if (enCours) return;
        void basculer(v === "oui");
      }}
    />
  );
}
