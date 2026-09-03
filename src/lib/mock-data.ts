import type { Contact, Folder, Space, Thread } from "./types";

export const SPACES: Space[] = [
  {
    id: "perso",
    name: "Perso",
    email: "thierry@icloud.com",
    icon: "house",
    signature: "Thierry",
    theme: {
      gradient:
        "linear-gradient(135deg, #7c3aed 0%, #db2777 55%, #f97316 100%)",
      accent: "#a855f7",
    },
  },
  {
    id: "pro",
    name: "Pro",
    email: "thierry@coworkingcafe.fr",
    icon: "briefcase",
    signature: "Thierry Milone\nCoworking Café · coworkingcafe.fr",
    theme: {
      gradient:
        "linear-gradient(135deg, #0ea5e9 0%, #2563eb 55%, #0f766e 100%)",
      accent: "#38bdf8",
    },
  },
  {
    id: "side",
    name: "Side projects",
    email: "hello@twe-ux.dev",
    icon: "flask",
    signature: "twe-ux · twe-ux.dev",
    theme: {
      gradient:
        "linear-gradient(135deg, #f59e0b 0%, #ea580c 55%, #b91c1c 100%)",
      accent: "#fbbf24",
    },
  },
];

export const FOLDERS: Folder[] = [
  { id: "inbox", name: "Boîte de réception" },
  { id: "starred", name: "Favoris" },
  { id: "snoozed", name: "En pause" },
  { id: "sent", name: "Envoyés" },
  { id: "drafts", name: "Brouillons" },
  { id: "archive", name: "Archive" },
  { id: "trash", name: "Corbeille" },
];

export const ME: Record<Space["id"], Contact> = {
  perso: { name: "Thierry", email: "thierry@icloud.com" },
  pro: { name: "Thierry Milone", email: "thierry@coworkingcafe.fr" },
  side: { name: "twe-ux", email: "hello@twe-ux.dev" },
};

const now = Date.now();
const ago = (hours: number) => new Date(now - hours * 3_600_000).toISOString();

const c = (name: string, email: string): Contact => ({ name, email });

const claire = c("Claire Dubois", "claire.dubois@gmail.com");
const marc = c("Marc Lefèvre", "marc@lefevre-archi.fr");
const sophie = c("Sophie Martin", "sophie@coworkingcafe.fr");
const julien = c("Julien Roux", "julien.roux@studio-nord.com");
const vercel = c("Vercel", "notifications@vercel.com");
const github = c("GitHub", "noreply@github.com");
const stripe = c("Stripe", "receipts@stripe.com");
const laposte = c("La Poste", "noreply@laposte.fr");
const amelie = c("Amélie Garnier", "amelie.garnier@proton.me");
const nina = c("Nina Bernard", "nina@collectif-atelier.org");
const ovh = c("OVHcloud", "billing@ovh.com");
const figma = c("Figma", "team@figma.com");

let seq = 0;
const id = (prefix: string) => `${prefix}-${++seq}`;

function thread(
  spaceId: Thread["spaceId"],
  folder: Thread["folder"],
  subject: string,
  messages: Array<{ from: Contact; to: Contact[]; hoursAgo: number; body: string }>,
  opts: Partial<Pick<Thread, "labels" | "unread" | "starred">> = {},
): Thread {
  const msgs = messages.map((m) => ({
    id: id("msg"),
    from: m.from,
    to: m.to,
    date: ago(m.hoursAgo),
    body: m.body.trim(),
  }));
  const last = msgs[msgs.length - 1];
  return {
    id: id("thr"),
    spaceId,
    folder,
    subject,
    snippet: last.body.split("\n")[0].slice(0, 140),
    labels: opts.labels ?? [],
    unread: opts.unread ?? false,
    starred: opts.starred ?? false,
    messages: msgs,
  };
}

export const THREADS: Thread[] = [
  // ───────────── Perso ─────────────
  thread(
    "perso",
    "inbox",
    "Week-end à Annecy : on confirme ?",
    [
      {
        from: claire,
        to: [ME.perso],
        hoursAgo: 1.2,
        body: `Salut Thierry,

J'ai regardé les dispos pour le chalet, il reste le week-end du 19. Tu es partant ? Marc et Amélie sont ok.

On pourrait partir vendredi soir pour éviter les bouchons.

Claire`,
      },
    ],
    { unread: true, labels: ["Amis"] },
  ),
  thread(
    "perso",
    "inbox",
    "Votre colis est en route",
    [
      {
        from: laposte,
        to: [ME.perso],
        hoursAgo: 3,
        body: `Bonjour,

Votre colis n° 6A12345678901 est pris en charge et sera livré demain entre 9h et 13h.

Suivez votre envoi depuis votre espace client.`,
      },
    ],
    { unread: true, labels: ["Achats"] },
  ),
  thread(
    "perso",
    "inbox",
    "Photos de l'anniversaire",
    [
      {
        from: amelie,
        to: [ME.perso, claire],
        hoursAgo: 26,
        body: `Coucou !

Voici le lien vers l'album partagé. Il y a quelques pépites de Marc en train de danser 😂

Bises`,
      },
      {
        from: ME.perso,
        to: [amelie, claire],
        hoursAgo: 20,
        body: `Merci Amélie ! Je vais les trier ce soir et en imprimer quelques-unes.`,
      },
      {
        from: claire,
        to: [ME.perso, amelie],
        hoursAgo: 18,
        body: `Celle avec le gâteau qui tombe est incroyable. On la garde pour la carte de Noël ?`,
      },
    ],
    { starred: true, labels: ["Famille"] },
  ),
  thread(
    "perso",
    "inbox",
    "Reçu de votre paiement — Spotify",
    [
      {
        from: stripe,
        to: [ME.perso],
        hoursAgo: 50,
        body: `Merci pour votre paiement de 10,99 € à Spotify AB.

Ce reçu est envoyé automatiquement, vous n'avez rien à faire.`,
      },
    ],
    { labels: ["Achats"] },
  ),
  thread(
    "perso",
    "inbox",
    "Cours d'escalade — rentrée",
    [
      {
        from: nina,
        to: [ME.perso],
        hoursAgo: 72,
        body: `Bonjour Thierry,

Les inscriptions pour la saison sont ouvertes. Ton créneau du mardi 19h est toujours dispo si tu veux le garder.

Réponds-moi avant le 15 pour que je bloque la place.

Nina`,
      },
    ],
    { unread: true },
  ),
  thread(
    "perso",
    "archive",
    "Réservation confirmée — Le Comptoir",
    [
      {
        from: c("Le Comptoir", "resa@lecomptoir.fr"),
        to: [ME.perso],
        hoursAgo: 200,
        body: `Votre table pour 4 personnes est confirmée samedi à 20h30. À très vite !`,
      },
    ],
  ),
  thread(
    "perso",
    "sent",
    "Re: Clés de l'appartement",
    [
      {
        from: ME.perso,
        to: [marc],
        hoursAgo: 30,
        body: `Je les ai laissées chez la gardienne, elle est là jusqu'à 18h. Bonne installation !`,
      },
    ],
  ),
  thread(
    "perso",
    "drafts",
    "Idées cadeaux",
    [
      {
        from: ME.perso,
        to: [claire],
        hoursAgo: 5,
        body: `Pour Marc : le livre sur l'architecture japonaise, ou…`,
      },
    ],
  ),

  // ───────────── Pro ─────────────
  thread(
    "pro",
    "inbox",
    "Devis aménagement salle de réunion",
    [
      {
        from: marc,
        to: [ME.pro],
        hoursAgo: 0.5,
        body: `Bonjour Thierry,

Ci-joint le devis mis à jour pour la salle de réunion du premier étage. J'ai intégré les cloisons vitrées comme convenu.

Le délai de réalisation est de 3 semaines à partir de la validation.

Bien à vous,
Marc Lefèvre`,
      },
    ],
    { unread: true, labels: ["Travaux"] },
  ),
  thread(
    "pro",
    "inbox",
    "Planning des événements de septembre",
    [
      {
        from: sophie,
        to: [ME.pro],
        hoursAgo: 4,
        body: `Hello,

J'ai mis à jour le planning : l'afterwork du 12 est confirmé, l'atelier « pitch » du 24 attend encore la salle.

Tu peux jeter un œil au tableau partagé ?

Sophie`,
      },
      {
        from: ME.pro,
        to: [sophie],
        hoursAgo: 3,
        body: `Vu, merci. Pour le 24 on prend la grande salle, je préviens Marc pour décaler les travaux.`,
      },
      {
        from: sophie,
        to: [ME.pro],
        hoursAgo: 2,
        body: `Parfait, je bloque. Tu veux que je lance la com' sur Instagram cette semaine ?`,
      },
    ],
    { unread: true, starred: true, labels: ["Événements"] },
  ),
  thread(
    "pro",
    "inbox",
    "[coworkingcafe] Deployment ready — production",
    [
      {
        from: vercel,
        to: [ME.pro],
        hoursAgo: 6,
        body: `Your deployment for coworkingcafe is ready.

Branch: main
Commit: feat(booking): add weekly pass
URL: https://coworkingcafe.fr`,
      },
    ],
    { labels: ["Dev"] },
  ),
  thread(
    "pro",
    "inbox",
    "Facture OVHcloud — septembre",
    [
      {
        from: ovh,
        to: [ME.pro],
        hoursAgo: 28,
        body: `Bonjour,

Votre facture n° FR123456 d'un montant de 47,88 € TTC est disponible dans votre espace client.

Le prélèvement sera effectué le 10 septembre.`,
      },
    ],
    { labels: ["Compta"] },
  ),
  thread(
    "pro",
    "inbox",
    "Candidature — poste barista",
    [
      {
        from: c("Lucas Petit", "lucas.petit@outlook.fr"),
        to: [ME.pro],
        hoursAgo: 45,
        body: `Bonjour,

Je me permets de vous contacter suite à votre annonce. J'ai 3 ans d'expérience en coffee shop et je suis disponible dès maintenant.

Vous trouverez mon CV en pièce jointe.

Cordialement,
Lucas Petit`,
      },
    ],
    { unread: true, labels: ["Recrutement"] },
  ),
  thread(
    "pro",
    "snoozed",
    "Relance : contrat de maintenance",
    [
      {
        from: c("Assist Clim", "contact@assistclim.fr"),
        to: [ME.pro],
        hoursAgo: 120,
        body: `Bonjour, nous n'avons pas reçu le contrat signé pour la maintenance annuelle. Pouvez-vous nous le retourner avant fin de mois ?`,
      },
    ],
  ),
  thread(
    "pro",
    "sent",
    "Confirmation de réservation — salle Atelier",
    [
      {
        from: ME.pro,
        to: [c("Studio Nord", "contact@studio-nord.com")],
        hoursAgo: 52,
        body: `Bonjour, votre réservation de la salle Atelier le 18 septembre de 14h à 18h est confirmée. À bientôt !`,
      },
    ],
  ),
  thread(
    "pro",
    "trash",
    "Offre exceptionnelle -70% sur nos mobiliers",
    [
      {
        from: c("Promo Bureau", "news@promo-bureau.com"),
        to: [ME.pro],
        hoursAgo: 80,
        body: `Profitez de nos remises exceptionnelles jusqu'à dimanche !`,
      },
    ],
  ),

  // ───────────── Side projects ─────────────
  thread(
    "side",
    "inbox",
    "[twe-ux/arc-mail] Review requested: Arc-like sidebar",
    [
      {
        from: github,
        to: [ME.side],
        hoursAgo: 0.3,
        body: `@julienroux requested your review on pull request #12.

"Adds the translucent sidebar with pinned tiles and the Today section. Would love feedback on the space switcher animation."`,
      },
    ],
    { unread: true, labels: ["GitHub"] },
  ),
  thread(
    "side",
    "inbox",
    "Maquette v3 — écran de lecture",
    [
      {
        from: julien,
        to: [ME.side],
        hoursAgo: 8,
        body: `Salut,

J'ai poussé la v3 sur Figma. Le panneau de lecture prend maintenant toute la hauteur, avec les actions flottantes en bas à droite.

Dis-moi si tu préfères garder la barre d'actions en haut.

Julien`,
      },
      {
        from: ME.side,
        to: [julien],
        hoursAgo: 7,
        body: `Top. Je préfère en bas à droite, ça ressemble plus à Arc. Je regarde ça ce soir.`,
      },
    ],
    { starred: true, labels: ["Design"] },
  ),
  thread(
    "side",
    "inbox",
    "Figma : Julien a commenté « Arc Mail — UI »",
    [
      {
        from: figma,
        to: [ME.side],
        hoursAgo: 9,
        body: `Julien Roux a laissé un commentaire : « On garde le dégradé violet pour l'espace Perso ? »`,
      },
    ],
    { labels: ["Design"] },
  ),
  thread(
    "side",
    "inbox",
    "Nom de domaine twe-ux.dev — renouvellement",
    [
      {
        from: ovh,
        to: [ME.side],
        hoursAgo: 96,
        body: `Votre nom de domaine twe-ux.dev arrive à expiration le 30 septembre. Le renouvellement automatique est activé.`,
      },
    ],
  ),
  thread(
    "side",
    "archive",
    "Welcome to Vercel",
    [
      {
        from: vercel,
        to: [ME.side],
        hoursAgo: 800,
        body: `Thanks for signing up! Deploy your first project in seconds.`,
      },
    ],
  ),
];
