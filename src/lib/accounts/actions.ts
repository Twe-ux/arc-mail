"use server";

import { revalidatePath } from "next/cache";

import { renameSpace } from "./server";
import type { SpaceIconName } from "@/lib/types";

/**
 * Renommer un espace depuis la boîte, sans passer par l'écran des comptes.
 *
 * L'action vit ici et non dans `app/comptes/` parce que ce n'est plus une
 * affaire de comptes : c'est le store qui l'appelle, depuis la barre latérale,
 * et une action rangée sous une route se lirait comme si elle en dépendait.
 *
 * Rend un état plutôt qu'une exception : l'appelant a déjà changé l'affichage
 * (écriture optimiste) et a besoin de savoir s'il doit revenir en arrière.
 */
export async function renommerEspace(
  id: string,
  patch: { name: string; icon: SpaceIconName },
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const nom = patch.name.trim();
  if (!nom) return { ok: false, message: "Un espace a besoin d'un nom." };
  try {
    const { id: pose } = await renameSpace(id, { name: nom, icon: patch.icon });
    revalidatePath("/");
    revalidatePath("/comptes");
    return { ok: true, id: pose };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}
