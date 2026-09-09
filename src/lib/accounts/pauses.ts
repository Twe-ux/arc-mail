import "server-only";

import { currentUser, supabaseServer } from "@/lib/supabase/server";

/**
 * **Les pauses suivent le compte.**
 *
 * Elles vivaient dans `localStorage`, donc par navigateur : la promesse ne
 * tenait que là où elle avait été faite. Ici, elles suivent la personne — et
 * le tour de relève peut les réveiller à l'heure dite plutôt qu'à la
 * prochaine ouverture.
 *
 * **Le navigateur reste le plus rapide** : le store écrit d'abord chez lui et
 * la base suit. Une écriture ratée laisse donc la pause **locale**, ce qui est
 * exactement le comportement d'avant — dégradé, jamais cassé.
 */
export type PauseRangee = { thread_id: string; wake: string; titre?: string; objet?: string };

export async function lirePauses(): Promise<Record<string, { wake: string }>> {
  const user = await currentUser();
  if (!user) return {};
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("mail_pauses")
    .select("thread_id, wake")
    .eq("user_id", user.id);
  if (error || !data) return {};
  return Object.fromEntries(
    (data as { thread_id: string; wake: string }[]).map((p) => [p.thread_id, { wake: p.wake }]),
  );
}

/** Poser ou déplacer une promesse. `upsert` : remettre en pause un fil déjà en pause est un geste. */
export async function ecrirePause(pause: PauseRangee): Promise<void> {
  const user = await currentUser();
  if (!user) return;
  const supabase = await supabaseServer();
  await supabase.from("mail_pauses").upsert({
    user_id: user.id,
    thread_id: pause.thread_id,
    wake: pause.wake,
    titre: pause.titre ?? null,
    objet: pause.objet ?? null,
  });
}

/** Oublier la promesse — l'annulation, le réveil, ou un fil qu'on a rangé. */
export async function oublierPauses(threadIds: string[]): Promise<void> {
  if (threadIds.length === 0) return;
  const user = await currentUser();
  if (!user) return;
  const supabase = await supabaseServer();
  await supabase.from("mail_pauses").delete().eq("user_id", user.id).in("thread_id", threadIds);
}
