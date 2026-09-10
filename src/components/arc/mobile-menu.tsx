"use client";

import { Pencil, Plus, Tag, X } from "lucide-react";
import { useState } from "react";

import { FOLDER_ICON, VUE_ICON } from "@/lib/folders";
import {
  selectUnreadCount,
  selectVueUnread,
  useFolders,
  useLabels,
  useMail,
  useRecentThreads,
} from "@/lib/store";
import type { FolderId, Vue } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BottomSheet, SheetCloseButton, SheetGroup, SheetRow, SheetScroller } from "./bottom-sheet";
import { ContactAvatar } from "./contact-avatar";

/**
 * La feuille Dossiers : les sept boîtes en grille, puis les récents.
 *
 * Elle ne porte plus que la navigation. Le réglage de l'espace — teinte,
 * thème, compte — est parti dans sa propre feuille : les deux tenaient dans
 * la même carte tant qu'il y avait trois dossiers et une case à cocher, plus
 * depuis. **Une feuille par intention.**
 *
 * Et le choix du compte est parti aussi : les espaces sont dans la barre du
 * bas, à demeure, sous le pouce. Le rail de pastilles qui les répétait ici
 * coûtait 52 px de tête pour un chemin qu'on ne prenait jamais.
 *
 * Les dossiers sont **des rangées**, comme « Déplacer vers » et « Plus » :
 * icône en trait, nom long, compte à droite. La grille de quatre colonnes a
 * tenu une journée — elle rendait 200 px — puis elle est partie : c'était la
 * dernière forme de l'app à ne pas parler la grammaire des autres feuilles,
 * et « trop de différence entre les fenêtres » coûte plus cher que deux cents
 * pixels de défilement.
 */
export function MobileMenu() {
  const folders = useFolders();
  const open = useMail((s) => s.sidebarOpen);
  const setOpen = useMail((s) => s.setSidebarOpen);
  const folderId = useMail((s) => s.folderId);
  const setFolder = useMail((s) => s.setFolder);
  const vues = useMail((s) => s.vues);
  const vueId = useMail((s) => s.vueId);
  const ouvrirVue = useMail((s) => s.ouvrirVue);
  const supprimerVue = useMail((s) => s.supprimerVue);
  /* Une vue **ou une étiquette** pose un dossier : sans ce témoin, sa rangée et
     celle du dossier seraient allumées ensemble. C'est elle qu'on regarde. */
  const detourne = useMail((s) => s.vueId !== null || s.etiquette !== null);
  const enregistrerVue = useMail((s) => s.enregistrerVue);
  const selectedThreadId = useMail((s) => s.selectedThreadId);
  const selectThread = useMail((s) => s.selectThread);
  const setCorrespondent = useMail((s) => s.setCorrespondent);
  const removeRecent = useMail((s) => s.removeRecent);
  const clearRecent = useMail((s) => s.clearRecent);
  const recentThreads = useRecentThreads();

  const go = (fn: () => void) => () => {
    fn();
    setOpen(false);
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={setOpen}
      title="Dossiers"
      description="Espaces, boîtes et conversations récentes"
      head={
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 truncate text-[17px] font-semibold">Dossiers</p>
          <SheetCloseButton onClose={() => setOpen(false)} />
        </div>
      }
    >
      <SheetScroller>
        <SheetGroup className="mt-1">
          {folders.map((f) => (
            <FolderRow
              key={f.id}
              id={f.id}
              name={f.name}
              active={f.id === folderId && !detourne}
              onClick={go(() => {
                setFolder(f.id);
                setCorrespondent(null);
              })}
            />
          ))}
        </SheetGroup>

        {/* **Les vues, dans leur propre groupe.** Un dossier est un endroit, une
            vue une question posée dessus : mêlées aux sept boîtes, elles
            feraient une liste de onze choses dont on ne saurait plus lesquelles
            se vident quand on archive.

            Le groupe existe **même vide**, réduit à sa ligne « Garder une
            recherche… » : sans elle la fonction n'avait qu'une porte, une ligne
            de la palette qui n'apparaît qu'après avoir tapé quelque chose — donc
            invisible tant qu'on ne s'en était pas déjà servi. */}
        <Section title="Vues">
          <SheetGroup>
            {vues.map((v) => (
              <VueRow
                key={v.id}
                vue={v}
                active={v.id === vueId}
                onClick={go(() => {
                  ouvrirVue(v.id);
                  setCorrespondent(null);
                })}
                onForget={() => supprimerVue(v.id)}
              />
            ))}
            <NouvelleVue
              onValider={(q) => {
                ouvrirVue(enregistrerVue(q).id);
                setCorrespondent(null);
                setOpen(false);
              }}
            />
          </SheetGroup>
        </Section>

        {/* **Les étiquettes, après les vues et avant les récents.** Même
            raison que sur bureau : elles ne vivaient que sur la rangée, donc on
            voyait qu'un fil en portait une sans pouvoir demander à les voir
            toutes. Le groupe n'existe que s'il y en a — il n'y a pas de table
            d'étiquettes, elles existent parce qu'un message les porte. */}
        <Etiquettes onChoisir={() => setOpen(false)} />

        <Section
          title="Aujourd'hui"
          action={
            recentThreads.length > 0 && (
              <button
                type="button"
                onClick={clearRecent}
                className="-my-2 py-2 text-[13px] font-medium text-[var(--space-ink)] active:opacity-60"
              >
                Effacer
              </button>
            )
          }
        >
          <SheetGroup>
            {recentThreads.length === 0 ? (
              <p className="px-4 py-3.5 text-[15px] text-muted-foreground">
                Les conversations que tu ouvres restent ici, comme les onglets d&apos;Arc.
              </p>
            ) : (
              recentThreads.map((t) => {
                const last = t.messages[t.messages.length - 1];
                return (
                  <SheetRow
                    key={t.id}
                    onClick={go(() => selectThread(t.id))}
                    active={t.id === selectedThreadId}
                    /* Une seconde cible, **à côté** du bouton de la rangée : un
                       bouton dans un bouton est du HTML invalide. */
                    suffixe={
                      <button
                        type="button"
                        onClick={() => removeRecent(t.id)}
                        aria-label={`Retirer ${t.subject}`}
                        className="relative flex size-8 items-center justify-center rounded-full text-muted-foreground after:absolute after:-inset-1.5 active:bg-muted"
                      >
                        <X className="size-4" />
                      </button>
                    }
                  >
                    <ContactAvatar contact={last.from} className="size-8" />
                    <span className="min-w-0 flex-1 truncate text-[15px]">{t.subject}</span>
                  </SheetRow>
                );
              })
            )}
          </SheetGroup>
        </Section>
      </SheetScroller>
    </BottomSheet>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-4">
      <div className="mb-1.5 flex items-center justify-between px-4">
        <h3 className="text-[13px] font-medium tracking-wide text-muted-foreground uppercase dark:text-white/55">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * Les étiquettes de l'espace, en rangées de feuille.
 *
 * Elles **filtrent le dossier ouvert**, comme « Non lus » : c'est le seul dont
 * on ait tous les fils, et une étiquette qui prétendrait ramasser toute la
 * boîte ne rendrait que ce que les dossiers déjà visités ont laissé en
 * mémoire. Re-toucher celle qui est ouverte la retire.
 */
function Etiquettes({ onChoisir }: { onChoisir: () => void }) {
  const labels = useLabels();
  const etiquette = useMail((s) => s.etiquette);
  const setEtiquette = useMail((s) => s.setEtiquette);
  if (labels.length === 0) return null;

  return (
    <Section title="Étiquettes">
      <SheetGroup>
        {labels.map((nom) => {
          const active = nom === etiquette;
          return (
            <SheetRow
              key={nom}
              active={active}
              onClick={() => {
                setEtiquette(active ? null : nom);
                onChoisir();
              }}
            >
              <Tag className="size-5 shrink-0" strokeWidth={1.75} />
              <span className={cn("min-w-0 flex-1 truncate text-[15px]", active && "font-medium")}>
                {nom}
              </span>
            </SheetRow>
          );
        })}
      </SheetGroup>
    </Section>
  );
}

/**
 * Une boîte : l'icône en trait, le nom, les non-lus à droite.
 *
 * Rien d'autre — c'est la rangée de « Déplacer vers » et de « Plus », et
 * l'état ouvert est celui de `SheetRow` (accent à 12 %) plutôt qu'une couleur
 * de plus. Le nom **long** revient avec la rangée : « Boîte de réception » a
 * toute la largeur pour se lire ici, et `FOLDER_SHORT` reste pour les
 * épinglés de la tête de liste, où il n'y a que 84 px.
 */
function FolderRow({
  id,
  name,
  active,
  onClick,
}: {
  id: FolderId;
  name: string;
  active: boolean;
  onClick: () => void;
}) {
  const count = useMail((s) => selectUnreadCount(s, s.spaceId, id));
  const Icon = FOLDER_ICON[id];
  return (
    <SheetRow active={active} onClick={onClick}>
      <Icon className="size-5 shrink-0" strokeWidth={1.75} />
      <span className={cn("min-w-0 flex-1 truncate text-[15px]", active && "font-medium")}>{name}</span>
      {count > 0 && (
        <span className="shrink-0 text-[15px] text-muted-foreground tabular-nums">
          {count}
          <span className="sr-only"> non lus</span>
        </span>
      )}
    </SheetRow>
  );
}

/**
 * Une vue : le même gabarit qu'une boîte, l'entonnoir à la place du dossier.
 *
 * Les deux cibles passent par `suffixe` — **à côté** du bouton, jamais dedans :
 * un `<button>` dans un `<button>` est du HTML invalide et le navigateur peut
 * le démonter. C'est la règle de `SheetRow` depuis les récents.
 *
 * **Un crayon plutôt qu'un double-appui.** La recherche se corrige au
 * double-clic dans la barre du bureau ; sur téléphone le double-appui ne veut
 * rien dire — il est pris par le zoom — et il ne s'annonce pas. Une cible
 * visible, donc.
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
      <ChampRangee
        depart={vue.q}
        placeholder="est:non-lu, de:claire…"
        aria={`Recherche de la vue ${vue.q}`}
        icone={<Pencil className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />}
        onClose={() => setEdite(false)}
        onValider={(q) => {
          setEdite(false);
          modifierVue(vue.id, q);
        }}
      />
    );
  }

  return (
    <SheetRow
      active={active}
      onClick={onClick}
      suffixe={
        <span className="flex items-center">
          <button
            type="button"
            onClick={() => setEdite(true)}
            aria-label={`Modifier la recherche ${vue.q}`}
            className="relative flex size-8 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            onClick={onForget}
            aria-label={`Oublier la vue ${vue.q}`}
            className="relative flex size-8 items-center justify-center rounded-full text-muted-foreground after:absolute after:-inset-1.5 active:bg-muted"
          >
            <X className="size-4" />
          </button>
        </span>
      }
    >
      <VUE_ICON className="size-5 shrink-0" strokeWidth={1.75} />
      <span className={cn("min-w-0 flex-1 truncate text-[15px]", active && "font-medium")}>{vue.q}</span>
      {count > 0 && (
        <span className="shrink-0 text-[15px] text-muted-foreground tabular-nums">
          {count}
          <span className="sr-only"> non lus</span>
        </span>
      )}
    </SheetRow>
  );
}

/**
 * « Garder une recherche… », dernière rangée du groupe des vues.
 *
 * Elle se change en champ sur place — la grammaire de la rangée, pas une boîte
 * de dialogue par-dessus une feuille. `Entrée` valide et ouvre la vue dans la
 * foulée : on la fabrique pour la regarder.
 *
 * Le clavier monte sous la feuille, qui est ancrée : il ne lui prend qu'un
 * `padding-bottom` (fiche PWA), et le champ reste visible sans que rien ne
 * bouge.
 */
function NouvelleVue({ onValider }: { onValider: (q: string) => void }) {
  const [saisie, setSaisie] = useState(false);
  if (!saisie) {
    return (
      <SheetRow onClick={() => setSaisie(true)}>
        <Plus className="size-5 shrink-0" strokeWidth={1.75} />
        <span className="min-w-0 flex-1 truncate text-[15px]">Garder une recherche…</span>
      </SheetRow>
    );
  }
  return (
    <ChampRangee
      placeholder="est:non-lu, de:claire…"
      aria="Requête de la nouvelle vue"
      icone={<Plus className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />}
      onClose={() => setSaisie(false)}
      onValider={onValider}
    />
  );
}

/**
 * Un champ **à la place d'une rangée** de feuille : même hauteur, même
 * gouttière, l'icône qui dit ce qu'on écrit.
 *
 * Une seule définition pour la requête d'une vue neuve et le nom d'une vue
 * gardée — deux gestes, la même forme.
 */
function ChampRangee({
  depart = "",
  placeholder,
  aria,
  icone,
  onClose,
  onValider,
}: {
  depart?: string;
  placeholder: string;
  aria: string;
  icone: React.ReactNode;
  onClose: () => void;
  onValider: (v: string) => void;
}) {
  const [v, setV] = useState(depart);
  return (
    <div className="flex h-[52px] items-center gap-3 px-4">
      {icone}
      <input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "Enter" && v.trim()) onValider(v.trim());
        }}
        onBlur={() => (v.trim() && v.trim() !== depart ? onValider(v.trim()) : onClose())}
        enterKeyHint="done"
        placeholder={placeholder}
        aria-label={aria}
        /* 16 px au moins : sous ce seuil iOS zoome sur le champ à la mise au
           point, et l'écran part de travers (fiche PWA). */
        className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
