import { laver } from "@/lib/search/parse";

/**
 * Le morceau trouvé, en couleur.
 *
 * **Deux surfaces s'en servent** : la palette ⌘K et la rangée de la liste quand
 * une vue est ouverte. Elle vivait dans la palette ; une vue est une recherche
 * qui a quitté la palette, et sans elle la liste rendait des lignes dont rien
 * ne disait pourquoi elles étaient là — « j'ai créé la vue icloud mais je
 * reçois autre chose ».
 *
 * Sans lui, une recherche sur « annecy » rend trois lignes qui se ressemblent
 * et il faut les relire pour savoir laquelle contenait le mot. Le surlignage
 * est un **fond** en teinte d'espace, jamais une encre colorée : la règle du
 * thème, et le seul choix lisible sur un fond clair comme sur un fond sombre.
 */
export function Surligne({ texte, requete }: { texte: string; requete: string }) {
  /* On cherche sur le texte **lavé** — sans accents ni casse, comme le fait le
     filtre — mais on découpe l'original : « Élodie » doit se surligner quand on
     tape « elodie ». Retirer un accent garde la longueur pour les lettres
     latines ; si une écriture décompose autrement, on préfère ne rien
     surligner à surligner de travers. */
  const cible = laver(texte);
  if (cible.length !== texte.length) return <>{texte}</>;
  /* **Le premier mot trouvé, pas le premier mot tapé.** Sur « facture annecy »,
     l'objet ne porte souvent que l'un des deux, et l'extrait que l'autre :
     s'en tenir au premier laissait l'une des deux lignes muette. */
  let i = -1;
  let terme = "";
  for (const mot of requete.trim().split(" ")) {
    if (mot.length < 2) continue;
    const trouve = cible.indexOf(mot);
    if (trouve >= 0) {
      i = trouve;
      terme = mot;
      break;
    }
  }
  if (i < 0) return <>{texte}</>;
  return (
    <>
      {texte.slice(0, i)}
      <mark className="rounded-[3px] bg-[color-mix(in_oklch,var(--space-accent)_30%,transparent)] text-inherit">
        {texte.slice(i, i + terme.length)}
      </mark>
      {texte.slice(i + terme.length)}
    </>
  );
}
