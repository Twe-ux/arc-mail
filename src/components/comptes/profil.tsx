"use client";

import { Camera, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AVATAR_BUCKET, cheminAvatar, preparerAvatar } from "@/lib/avatar";
import { hueFor, initials } from "@/lib/format";
import { supabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { CHAMP } from "./champ";

/**
 * **Le profil : le visage et le nom du compte.**
 *
 * Il est arrivé avec la porte par lien : « Continuer avec Google » posait un
 * `avatar_url` dans les métadonnées, et l'app le lisait. Sans lui, `session.avatar`
 * valait `null` pour tout le monde — le champ était encore lu, il n'était plus
 * jamais rempli. On rend donc la photo à la personne au lieu de la demander à
 * un fournisseur.
 *
 * **Ce que ce nom n'est pas.** Il ne signe aucun courrier : c'est l'identité
 * de l'espace (`Space.identity`, réglée plus bas dans cette page) qui part
 * dans l'en-tête `From`. Celui-ci ne vit que dans l'app — la barre, le menu du
 * compte, et nos propres messages dans un fil. La carte le dit, parce que
 * « nom » sur un client de messagerie se lit spontanément comme « ce que voit
 * le destinataire ».
 *
 * **La photo s'applique tout de suite, le nom au blur.** Une photo n'a pas
 * d'état de brouillon : on la choisit, on la voit. Un nom, si — et le dépôt a
 * déjà tranché pour le nom d'un espace : au blur, pas à la frappe.
 */
export function Profil({
  userId,
  email,
  nom,
  avatar,
}: {
  userId: string;
  email: string;
  nom: string | null;
  avatar: string | null;
}) {
  const router = useRouter();
  /* L'aperçu local prend la main dès que l'image est prête : le téléversement
     puis le rendu serveur prennent une seconde, et voir sa photo apparaître
     avec ce retard donne l'impression que le clic n'a rien fait. */
  const [apercu, setApercu] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [etat, setEtat] = useState<"" | "enregistre">("");
  const [enCours, lancer] = useTransition();
  const [survol, setSurvol] = useState(false);

  const photo = apercu ?? avatar;
  const titre = nom?.trim() || email;
  const h = hueFor(email);

  const poser = (f: File | undefined) => {
    if (!f) return;
    setErreur(null);
    lancer(async () => {
      try {
        const { blob, apercu: vignette } = await preparerAvatar(f);
        setApercu(vignette);
        const supabase = supabaseBrowser();
        const chemin = cheminAvatar(userId);
        const { error } = await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(chemin, blob, { upsert: true, contentType: "image/webp" });
        if (error) throw error;
        /* Le chemin dans les métadonnées, pas l'URL : une URL signée expire, et
           on ne garde jamais une valeur qui cessera d'être vraie. */
        const { error: meta } = await supabase.auth.updateUser({ data: { avatar_path: chemin } });
        if (meta) throw meta;
        router.refresh();
      } catch (e) {
        setApercu(null);
        setErreur(e instanceof Error ? e.message : "La photo n'a pas pu être posée.");
      }
    });
  };

  const retirer = () =>
    lancer(async () => {
      setErreur(null);
      try {
        const supabase = supabaseBrowser();
        await supabase.storage.from(AVATAR_BUCKET).remove([cheminAvatar(userId)]);
        const { error } = await supabase.auth.updateUser({ data: { avatar_path: null } });
        if (error) throw error;
        setApercu(null);
        router.refresh();
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "La photo n'a pas pu être retirée.");
      }
    });

  const renommer = (valeur: string) => {
    const propre = valeur.trim();
    if (propre === (nom ?? "")) return;
    lancer(async () => {
      setErreur(null);
      try {
        const { error } = await supabaseBrowser().auth.updateUser({
          data: { full_name: propre || null },
        });
        if (error) throw error;
        setEtat("enregistre");
        router.refresh();
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Le nom n'a pas pu être enregistré.");
      }
    });
  };

  return (
    <section className="fenetre-carte mb-3 rounded-[24px] bg-card p-4 text-card-foreground md:mb-4 md:rounded-[28px] md:p-6">
      <div className="flex items-start gap-4">
        {/* **Le visage est la cible.** Un `<label>` autour d'une entrée cachée :
            au clavier il prend le focus comme un bouton, et il accepte le
            fichier déposé dessus sans qu'on ait à écrire un second chemin. */}
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setSurvol(true);
          }}
          onDragLeave={() => setSurvol(false)}
          onDrop={(e) => {
            e.preventDefault();
            setSurvol(false);
            poser(e.dataTransfer.files[0]);
          }}
          className={cn(
            "group relative shrink-0 cursor-pointer rounded-full outline-none ring-offset-2 ring-offset-card transition-[box-shadow]",
            "focus-within:ring-2 focus-within:ring-[var(--space-ink)]",
            survol && "ring-2 ring-[var(--space-ink)]",
          )}
        >
          <Avatar className="size-[72px]">
            {photo && <AvatarImage src={photo} alt="" className="object-cover" />}
            <AvatarFallback
              className="text-xl font-semibold text-white"
              style={{
                background: `linear-gradient(135deg, oklch(0.78 0.12 ${h}), oklch(0.58 0.17 ${(h + 40) % 360}))`,
              }}
            >
              {initials(titre)}
            </AvatarFallback>
          </Avatar>
          {/* La pastille dit ce que le rond fait — sans elle, rien n'annonce
              qu'un visage se clique. */}
          <span
            aria-hidden
            className="absolute -right-0.5 -bottom-0.5 grid size-7 place-items-center rounded-full bg-card text-[var(--space-ink)] shadow-[0_0_0_1px_var(--border)]"
          >
            {enCours ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" strokeWidth={1.75} />}
          </span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              poser(e.target.files?.[0]);
              /* Remis à zéro : reprendre le **même** fichier après un échec ne
                 déclencherait sinon aucun `change`. */
              e.target.value = "";
            }}
          />
          <span className="sr-only">Changer la photo du compte</span>
        </label>

        <div className="min-w-0 flex-1">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium">Nom affiché</span>
            <input
              defaultValue={nom ?? ""}
              placeholder={email.split("@")[0]}
              autoComplete="name"
              onBlur={(e) => renommer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              onInput={() => setEtat("")}
              className={cn(CHAMP, "w-full")}
            />
          </label>

          {/* Deux lignes courtes, pas un paragraphe. La première est un fait,
              la seconde évite le malentendu qui compte : sur un client de
              messagerie, « nom » se lit spontanément comme « ce que voit le
              destinataire ». Mesuré à quatre lignes dans la première version —
              plus de gris que de champ, et le champ est le sujet de la carte. */}
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            {etat === "enregistre" ? "Enregistré." : `Connecté avec ${email}.`}
            <br />
            Visibles dans l&apos;app seulement&nbsp;: un destinataire voit l&apos;identité de
            l&apos;espace.
          </p>

          {/* **Pas de bouton « Ajouter une photo ».** Le rond est la cible, et
              sa pastille d'appareil le dit — c'est la convention partout, et un
              bouton de plus tombait sous l'avatar, désaligné de la colonne du
              champ. Ne reste que ce que le rond ne sait pas faire : défaire. */}
          {photo && (
            <Button
              type="button"
              variant="ghost"
              disabled={enCours}
              onClick={retirer}
              className="mt-2 h-9 rounded-xl text-muted-foreground"
            >
              <Trash2 />
              Retirer la photo
            </Button>
          )}
        </div>
      </div>

      {erreur && (
        <p role="alert" className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-[13px] leading-relaxed text-destructive">
          {erreur}
        </p>
      )}
    </section>
  );
}
