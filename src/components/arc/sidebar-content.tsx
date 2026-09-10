"use client";

import { useState } from "react";

import { Settings2, Plus, Tag, X, type LucideIcon } from "lucide-react";

import { AccountMenu } from "@/components/auth/account-menu";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FOLDER_ICON, VUE_ICON } from "@/lib/folders";
import { FOLDERS } from "@/lib/mock-data";
import { selectUnreadCount, selectVueUnread, useLabels, useMail, useFolders } from "@/lib/store";
import type { FolderId, Vue } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AppearancePanel } from "./theme-picker";
import { SidebarRecents } from "./sidebar-recents";
import { SpaceSwitcher } from "./space-switcher";

/** The four "favorite" tiles under the address bar, like Arc's pinned favorites. */
export const PINNED: FolderId[] = ["inbox", "starred", "sent", "drafts"];

/**
 * L'encre de la barre, sur le dégradé de l'espace.
 *
 * **Une seule encre secondaire, à 85 %.** La barre n'a pas de fond à elle :
 * l'encre est posée droit sur le fond calmé, et mesurée à l'endroit exact où
 * chacune est dessinée — pire cas Side en haut de la fenêtre : blanc pur
 * 6,14:1, 85 % 4,96:1, 80 % 4,58:1, 75 % 4,22:1. Il y en a donc une, pas trois
 * qui camperaient sur la ligne AA ; la hiérarchie passe par la taille, la
 * graisse et les capitales.
 *
 * La variante « surface » a disparu avec le tiroir mobile qui la portait : la
 * barre n'existe plus que sur bureau, sur le dégradé.
 */
export const TN = {
  text: "text-[var(--side-ink)]",
  sub: "text-[var(--side-ink-soft)]",
  faint: "text-[var(--side-ink-soft)]",
  heading: "text-[var(--side-ink-soft)]",
  tile: "bg-[var(--side-fill)] text-[var(--side-ink-soft)] hover:bg-[var(--side-fill-hover)] hover:text-[var(--side-ink)]",
  tileActive: "bg-[var(--side-fill-active)] text-[var(--side-ink)]",
  item: "text-[var(--side-ink-soft)] hover:bg-[var(--side-fill-hover)] hover:text-[var(--side-ink)]",
  itemActive: "bg-[var(--side-fill-active)] font-medium text-[var(--side-ink)]",
  count: "bg-[var(--side-fill-hover)]",
  sep: "bg-[var(--side-line)]",
  close: "hover:bg-[var(--side-fill-hover)]",
  icon: "text-[var(--side-ink-soft)] hover:bg-[var(--side-fill-hover)] hover:text-[var(--side-ink)]",
  hover: "hover:text-[var(--side-ink)]",
} as const;

/**
 * **Le trait des glyphes de la barre.**
 *
 * L'actif gagne du poids comme son libellé gagne sa graisse : le même signal,
 * dit deux fois sur la même rangée. À 2 partout — la valeur par défaut de
 * lucide — la ligne allumée ne se distinguait que par son fond, et sur le
 * voile clair ce fond vaut 13 % d'encre : l'icône y disait exactement la même
 * chose que ses voisines.
 *
 * **Le poids plutôt que la couleur.** La barre n'a qu'une encre, mesurée sur
 * son fond ; une seconde y demanderait quatre mesures (deux thèmes × deux
 * fonds de bureau) pour un signal que la graisse donne gratuitement — et
 * `--space-ink` est calculé pour les surfaces blanches de l'app, pas pour un
 * dégradé.
 *
 * 1,75 au repos est le trait des rangées de feuilles : une seule grammaire de
 * glyphe dans toute l'app.
 */
export const TRAIT = { actif: 2.4, repos: 1.75 } as const;

/**
 * Le contenu de la barre attachée, du haut vers le bas.
 *
 * **Le bloc nom + adresse + palette a disparu** — deux doublons : le nom de
 * l'espace est déjà porté par la rangée de boîtes en bas, et la palette faisait
 * exactement ce que fait le bouton « Apparence » à côté d'elle.
 *
 * **Elle ne porte plus la recherche ni le repli** : ils vivaient tout en haut et
 * disparaissaient avec elle, ce qui obligeait la tête de liste à s'effacer quand
 * la barre était attachée — sinon deux champs de recherche à l'écran. Descendus
 * dans la tête de liste, ils ne bougent plus, et la barre commence par ce
 * qu'elle est seule à savoir faire : les dossiers.
 */
export function SidebarContent() {
  const folders = useFolders();
  const folderId = useMail((s) => s.folderId);
  const setFolder = useMail((s) => s.setFolder);
  const inboxUnread = useMail((s) => selectUnreadCount(s, s.spaceId, "inbox"));
  /* Une vue **ou une étiquette** pose un dossier — celui qu'elle interroge —,
     donc sans ce témoin deux lignes seraient allumées en même temps : le
     dossier et elle. C'est elle qu'on regarde ; le dossier n'est que l'endroit
     où elle cherche. Signalé le 10 sept. pour les étiquettes — « si je clique
     sur une étiquette, réception ne doit plus être sélectionné » : le témoin
     existait depuis les vues, il ne connaissait qu'elles. */
  const detourne = useMail((s) => s.vueId !== null || s.etiquette !== null);

  return (
    <>
      {/* Pinned favorites */}
      <div className="grid shrink-0 grid-cols-4 gap-1.5">
        {PINNED.map((id) => {
          const Icon = FOLDER_ICON[id];
          /* Le nom long, cherché dans la table **complète** : les épinglés sont
             quatre boîtes fixes, dont aucune n'est conditionnelle. */
          const name = FOLDERS.find((f) => f.id === id)?.name ?? id;
          const active = id === folderId && !detourne;
          const dot = id === "inbox" && inboxUnread > 0;
          return (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setFolder(id)}
                  aria-label={name}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-12 items-center justify-center rounded-xl transition-colors",
                    active ? TN.tileActive : TN.tile,
                  )}
                >
                  <Icon className="size-5" strokeWidth={active ? TRAIT.actif : TRAIT.repos} />
                  {dot && <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-current" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{name}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Folders */}
      <nav className="flex shrink-0 flex-col gap-0.5" aria-label="Dossiers">
        {folders.map((f) => (
          <FolderRow
            key={f.id}
            icon={FOLDER_ICON[f.id]}
            name={f.name}
            active={f.id === folderId && !detourne}
            folderId={f.id}
            onClick={() => setFolder(f.id)}
          />
        ))}
      </nav>

      <Vues />

      <Etiquettes />

      <Separator className={TN.sep} />

      <SidebarRecents />

      {/* **Une rangée, pas deux.** Le compte occupait la ligne au-dessus —
          visage, nom, engrenage, sortie — pour deux portes qu'on prend
          rarement, avec un nom en double avec l'espace courant juste en
          dessous. Il descend ici, réduit à son visage, ses portes dans un menu.

          Et **« Nouveau message » n'y est plus** : il vit dans la tête de
          liste, contre le sélecteur de barre, dans les trois états. Deux
          boutons pour le même geste à deux endroits de la même fenêtre, c'est
          un de trop — celui qui reste porte la couleur de l'espace, puisque
          c'est la seule chose qu'on vienne faire dans une boîte sans y avoir
          été appelé. */}
      <div className="relative flex shrink-0 items-center justify-between gap-1 pt-1">
        <SpaceSwitcher />
        <div className="flex items-center gap-0.5">
          {/* La lune basculait le thème d'un coup. Le thème est devenu un
              réglage parmi cinq, dans ce panneau : l'icône dit donc « réglages »
              et non « sombre ». */}
          <AppearancePanel tooltip="Apparence et réglages">
            <button
              type="button"
              aria-label="Apparence et réglages"
              className={cn("flex size-8 items-center justify-center rounded-lg transition-colors", TN.icon)}
            >
              <Settings2 className="size-4" />
            </button>
          </AppearancePanel>
          <AccountMenu className={TN.icon} />
        </div>
      </div>
    </>
  );
}

/**
 * **Les étiquettes, sous les vues.**
 *
 * Elles vivaient **sur la rangée** et nulle part ailleurs : on voyait qu'un fil
 * portait « Melvynx », on ne pouvait pas demander « montre-moi les Melvynx ».
 * Et sur une colonne étroite — la liste à 360 px, message ouvert — la puce
 * tombait entre le nom et l'heure, là où il n'y a pas la place. Signalé :
 * « peux-tu les mettre sous la sidebar ».
 *
 * **Un filtre du dossier ouvert, pas une boîte.** Comme « Non lus », et pour la
 * même raison : le dossier qu'on regarde est le seul dont on ait tous les
 * fils. Prétendre ramasser une étiquette dans toute la boîte ne rendrait que ce
 * que les dossiers déjà visités ont laissé en mémoire — donc autre chose selon
 * l'endroit d'où on l'ouvre, ce que la fiche des vues interdit déjà.
 *
 * **Le groupe n'existe que s'il y a des étiquettes** : il n'y a pas de table
 * d'étiquettes, elles existent parce qu'un message les porte. Un intitulé ne se
 * pose pas au-dessus de rien.
 */
function Etiquettes() {
  const labels = useLabels();
  const etiquette = useMail((s) => s.etiquette);
  const setEtiquette = useMail((s) => s.setEtiquette);
  if (labels.length === 0) return null;

  return (
    <nav className="flex shrink-0 flex-col gap-0.5" aria-label="Étiquettes">
      <p
        className={cn(
          "px-2.5 pt-1 pb-0.5 text-[11px] font-semibold tracking-wider uppercase",
          TN.heading,
        )}
      >
        Étiquettes
      </p>
      {labels.map((nom) => {
        const active = nom === etiquette;
        return (
          <button
            key={nom}
            type="button"
            /* Re-cliquer l'étiquette ouverte la retire : la porte d'entrée est
               la porte de sortie, comme les deux cases d'un segmenté. */
            onClick={() => setEtiquette(active ? null : nom)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors",
              active ? TN.itemActive : TN.item,
            )}
          >
            <Tag className="size-4 shrink-0" strokeWidth={active ? TRAIT.actif : TRAIT.repos} />
            <span className="min-w-0 flex-1 truncate text-left">{nom}</span>
          </button>
        );
      })}
    </nav>
  );
}

/**
 * Les vues enregistrées, sous les dossiers.
 *
 * **Sous et non parmi** : un dossier est un endroit où le courrier est rangé,
 * une vue une question posée dessus. Les mêler donnerait une liste de onze
 * choses dont on ne saurait plus lesquelles se vident quand on archive.
 *
 * **Le groupe existe même vide**, réduit à sa ligne « Garder une recherche… ».
 * C'est la seule entorse à la règle « un intitulé ne se pose pas au-dessus de
 * rien », et elle est délibérée : la fonction n'avait qu'une porte, une ligne de
 * ⌘K qui n'apparaît qu'après avoir tapé quelque chose. Elle était donc invisible
 * tant qu'on ne s'en était pas déjà servi — « je ne comprends pas comment ça
 * marche ». Une ligne posée à demeure l'annonce ; c'est ce qu'elle coûte.
 */
function Vues() {
  const vues = useMail((s) => s.vues);
  const vueId = useMail((s) => s.vueId);
  const ouvrirVue = useMail((s) => s.ouvrirVue);
  const supprimerVue = useMail((s) => s.supprimerVue);
  const enregistrerVue = useMail((s) => s.enregistrerVue);
  const [saisie, setSaisie] = useState(false);

  return (
    <nav className="flex shrink-0 flex-col gap-0.5" aria-label="Vues">
      <p className={cn(/* La grammaire des intitulés de la barre, celle d'« Aujourd'hui ». */
        "px-2.5 pt-1 pb-0.5 text-[11px] font-semibold tracking-wider uppercase", TN.heading)}>
        Vues
      </p>
      {vues.map((v) => (
        <VueRow
          key={v.id}
          vue={v}
          active={v.id === vueId}
          onClick={() => ouvrirVue(v.id)}
          onForget={() => supprimerVue(v.id)}
        />
      ))}
      {saisie ? (
        <SaisieVue
          aria="Requête de la nouvelle vue"
          onClose={() => setSaisie(false)}
          onValider={(q) => {
            setSaisie(false);
            ouvrirVue(enregistrerVue(q).id);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setSaisie(true)}
          className={cn("flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors", TN.item)}
        >
          <Plus className="size-4 shrink-0" strokeWidth={TRAIT.repos} />
          <span className="min-w-0 flex-1 truncate text-left">Garder une recherche…</span>
        </button>
      )}
    </nav>
  );
}

/**
 * La requête, tapée dans la barre.
 *
 * **Un champ à la place de la ligne**, pas une boîte de dialogue : la vue qu'on
 * fabrique va vivre ici, elle s'écrit ici. Le champ garde la boîte de la
 * rangée qu'il remplace — même hauteur, même rayon —, prend le focus, et
 * ressort au vide comme à `Échap`.
 *
 * `Entrée` valide, et ouvre la vue dans la foulée : on la fabrique pour la
 * regarder, pas pour la ranger.
 */
function SaisieVue({
  depart = "",
  placeholder = "est:non-lu, de:claire…",
  aria,
  onClose,
  onValider,
}: {
  depart?: string;
  placeholder?: string;
  aria: string;
  onClose: () => void;
  onValider: (q: string) => void;
}) {
  const [q, setQ] = useState(depart);
  return (
    <input
      autoFocus
      value={q}
      onChange={(e) => setQ(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
        if (e.key === "Enter" && q.trim()) onValider(q.trim());
      }}
      /* Sortir en ayant écrit quelque chose **valide** : un nom corrigé puis
         abandonné d'un clic à côté serait un travail perdu sans le dire.
         `Échap` reste le chemin qui annule. */
      onBlur={() => (q.trim() && q.trim() !== depart ? onValider(q.trim()) : onClose())}
      onFocus={(e) => e.currentTarget.select()}
      placeholder={placeholder}
      aria-label={aria}
      className={cn(
        "h-8 w-full rounded-lg bg-[var(--side-fill-active)] px-2.5 text-sm outline-none",
        "text-[var(--side-ink)] placeholder:text-[var(--side-ink-soft)]",
      )}
    />
  );
}

/**
 * Une vue dans la barre — et **sa recherche se corrige au double-clic**.
 *
 * La rangée **est** la requête : il n'y a rien d'autre à modifier. Elle a porté
 * une étiquette séparée une demi-journée, et la corriger ne changeait rien à ce
 * que la liste montrait — « quand je change le nom, la recherche reste sur la
 * précédente ». Une chose à lire, une chose à modifier.
 *
 * Le double-clic est le geste d'édition partout où une liste porte des chaînes
 * qu'on a écrites — un fichier, un onglet, un calque —, et il laisse le simple
 * clic à l'action principale : ouvrir la vue.
 */
function VueRow({
  vue,
  active,
  onClick,
  onForget,
}: {
  vue: Vue;
  active: boolean;
  onClick: () => void;
  onForget: () => void;
}) {
  const count = useMail((s) => selectVueUnread(s, vue));
  const modifierVue = useMail((s) => s.modifierVue);
  const [edite, setEdite] = useState(false);

  if (edite) {
    return (
      <SaisieVue
        depart={vue.q}
        aria={`Recherche de la vue ${vue.q}`}
        onClose={() => setEdite(false)}
        onValider={(q) => {
          setEdite(false);
          modifierVue(vue.id, q);
        }}
      />
    );
  }

  return (
    /* **La croix est une sœur du bouton, jamais sa fille** : un `<button>` dans
       un `<button>` est du HTML invalide et le navigateur peut le démonter. Le
       groupe porte donc le fond au survol, et chaque cible le sien. */
    <div
      className={cn(
        "group/vue flex h-8 items-center rounded-lg pr-1 transition-colors",
        active ? TN.itemActive : "hover:bg-[var(--side-fill-hover)]",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        onDoubleClick={() => setEdite(true)}
        aria-current={active ? "page" : undefined}
        title={`${vue.q} — double-clic pour modifier la recherche`}
        className={cn(
          "flex h-8 min-w-0 flex-1 items-center gap-2.5 rounded-lg pl-2.5 text-sm transition-colors",
          active ? "text-[var(--side-ink)]" : cn(TN.hover, "text-[var(--side-ink-soft)]"),
        )}
      >
        <VUE_ICON className="size-4 shrink-0" strokeWidth={active ? TRAIT.actif : TRAIT.repos} />
        <span className="min-w-0 flex-1 truncate text-left">{vue.q}</span>
      </button>
      {count > 0 && (
        <span className={cn("mr-1 rounded-full px-1.5 text-[11px] font-semibold tabular-nums", TN.count)}>
          {count}
        </span>
      )}
      {/* Oublier une vue ne se propose qu'au survol : c'est un geste rare, et
          une croix à demeure sur chaque ligne ferait une colonne de croix. */}
      <button
        type="button"
        onClick={onForget}
        aria-label={`Oublier la vue ${vue.q}`}
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-md opacity-0 transition-opacity group-hover/vue:opacity-100 focus-visible:opacity-100",
          TN.icon,
        )}
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

function FolderRow({
  icon: Icon,
  name,
  active,
  folderId,
  onClick,
}: {
  icon: LucideIcon;
  name: string;
  active: boolean;
  folderId: FolderId;
  onClick: () => void;
}) {
  const count = useMail((s) => selectUnreadCount(s, s.spaceId, folderId));
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn("flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors", active ? TN.itemActive : TN.item)}
    >
      <Icon className="size-4 shrink-0" strokeWidth={active ? TRAIT.actif : TRAIT.repos} />
      <span className="min-w-0 flex-1 truncate text-left">{name}</span>
      {count > 0 && (
        <span className={cn("rounded-full px-1.5 text-[11px] font-semibold tabular-nums", TN.count)}>{count}</span>
      )}
    </button>
  );
}
