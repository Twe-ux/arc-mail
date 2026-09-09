import { NextResponse, type NextRequest } from "next/server";

import { pushConfigure } from "@/lib/push/serveur";
import { currentUser, supabaseServer } from "@/lib/supabase/server";

/**
 * L'appareil qui demande à être prévenu, et celui qui se retire.
 *
 * Rien de secret ne passe ici : une souscription Web Push est faite d'une
 * adresse chez le relais et de deux clés **publiques**. Elle est écrite avec
 * le client de session, donc sous RLS — chacun n'inscrit que ses appareils.
 *
 * `endpoint` est unique et identifie l'appareil : un `upsert` dessus rend le
 * geste idempotent, et une réinstallation qui rend la même adresse ne crée pas
 * un doublon qu'on notifierait deux fois.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body =
  | { op: "abonner"; endpoint: string; p256dh: string; auth: string; appareil?: string }
  | { op: "desabonner"; endpoint: string };

export async function POST(request: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  if (!pushConfigure())
    return NextResponse.json(
      { error: "Les notifications ne sont pas configurées sur ce déploiement." },
      { status: 503 },
    );

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Requête illisible." }, { status: 400 });
  }

  const supabase = await supabaseServer();

  if (body.op === "desabonner") {
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", body.endpoint);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (!body.endpoint || !body.p256dh || !body.auth)
    return NextResponse.json({ error: "Souscription incomplète." }, { status: 400 });

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: body.endpoint,
      p256dh: body.p256dh,
      auth: body.auth,
      appareil: body.appareil ?? null,
    },
    { onConflict: "endpoint" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
