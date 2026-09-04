import Link from "next/link";

/**
 * Ce que `/connexion` montre quand Supabase n'est pas configuré.
 *
 * Avant, la page renvoyait à la boîte : une variable oubliée ressemblait donc
 * à une page absente, et c'est exactement ce qui s'est produit. Elle dit
 * maintenant ce qui manque — **les noms, jamais les valeurs** — et la seule
 * chose à faire, qui n'est pas évidente : `NEXT_PUBLIC_*` est remplacé à la
 * construction, pas lu à l'exécution, donc poser la variable ne suffit pas,
 * il faut reconstruire.
 */
export function ConfigManquante({ url, anonKey }: { url: readonly string[]; anonKey: readonly string[] }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-4 [background:linear-gradient(135deg,#7c3aed_0%,#db2777_55%,#f97316_100%)]">
      <div className="fixed inset-0 bg-[rgb(16_14_24/0.45)]" aria-hidden />
      <div className="relative w-full max-w-md rounded-[28px] bg-card p-7 text-card-foreground shadow-2xl ring-1 ring-black/[0.06] dark:ring-white/12">
        <h1 className="text-[22px] font-bold tracking-tight">Connexion indisponible</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Supabase n&apos;est pas configuré dans <em>ce déploiement</em>. La boîte reste accessible en
          maquette, sans compte.
        </p>

        <div className="mt-5 rounded-xl bg-muted/60 p-4 text-[13px] dark:bg-white/[0.06]">
          <p className="font-semibold">Variables attendues, absentes ici :</p>
          <ul className="mt-2 space-y-1.5">
            {url.length > 0 && <Manquante noms={url} />}
            {anonKey.length > 0 && <Manquante noms={anonKey} />}
          </ul>
        </div>

        <ol className="mt-5 list-decimal space-y-2 pl-5 text-[13px] leading-relaxed text-muted-foreground">
          <li>
            Les poser dans Vercel — l&apos;intégration Supabase le fait seule — pour{" "}
            <strong className="text-foreground">l&apos;environnement que tu ouvres</strong> :
            Production et Preview sont deux listes distinctes.
          </li>
          <li>
            <strong className="text-foreground">Redéployer.</strong> Une variable{" "}
            <code className="rounded bg-foreground/10 px-1">NEXT_PUBLIC_*</code> est écrite dans le
            paquet au moment de la construction ; l&apos;ajouter ne change rien au déploiement déjà
            construit.
          </li>
        </ol>

        <Link
          href="/"
          className="mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-foreground text-[15px] font-semibold text-background transition-transform ease-out active:scale-[0.98] active:duration-0"
        >
          Aller à la boîte
        </Link>
      </div>
    </main>
  );
}

/** Un nom, ou plusieurs si l'un ou l'autre convient. */
function Manquante({ noms }: { noms: readonly string[] }) {
  return (
    /* `break-all` : un nom de variable n'a aucune césure naturelle, et
       `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` sortait de la carte sur
       un téléphone — mesuré à 393 px. */
    <li className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-1">
      {noms.map((nom, i) => (
        <span key={nom} className="flex min-w-0 items-baseline gap-1.5">
          {i > 0 && <span className="shrink-0 text-muted-foreground">ou</span>}
          <code className="min-w-0 rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-[12px] break-all">
            {nom}
          </code>
        </span>
      ))}
    </li>
  );
}
