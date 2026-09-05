import type { AccountRef } from "./mail/provider";
import type { Attachment, Contact, Folder, Space, SpaceId, Thread } from "./types";

/** The mock gives each space its own account: three different addresses. `mock:perso`. */
export const mockAccount = (spaceId: SpaceId): AccountRef => ({ id: `mock:${spaceId}`, kind: "mock" });

export const SPACES: Space[] = [
  {
    id: "perso",
    account: mockAccount("perso"),
    inboxPath: "INBOX",
    name: "Perso",
    email: "thierry@icloud.com",
    identity: { name: "Thierry", email: "thierry@icloud.com" },
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
    account: mockAccount("pro"),
    inboxPath: "INBOX",
    name: "Pro",
    email: "thierry@coworkingcafe.fr",
    identity: { name: "Thierry Milone", email: "thierry@coworkingcafe.fr" },
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
    account: mockAccount("side"),
    inboxPath: "INBOX",
    name: "Side projects",
    email: "hello@twe-ux.dev",
    identity: { name: "twe-ux", email: "hello@twe-ux.dev" },
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

/** L'expéditeur de chaque espace mock, pour fabriquer le jeu de données. */
export const ME: Record<string, Contact> = {
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

// Enough correspondents for each inbox to run well past a phone screen.
const lucas = c("Lucas Perrin", "lucas.perrin@gmail.com");
const karine = c("Karine Vidal", "karine.vidal@orange.fr");
const theo = c("Théo Mercier", "theo@mercier-photo.fr");
const doctolib = c("Doctolib", "no-reply@doctolib.fr");
const edf = c("EDF", "contact@edf.fr");
const spotify = c("Spotify", "no-reply@spotify.com");
const leboncoin = c("leboncoin", "contact@leboncoin.fr");
const mairie = c("Mairie d'Annecy", "contact@annecy.fr");
const banque = c("Crédit Mutuel", "info@creditmutuel.fr");
const decathlon = c("Decathlon", "commande@decathlon.fr");
const airbnb = c("Airbnb", "automated@airbnb.com");

const laurent = c("Laurent Bouvier", "l.bouvier@fiduciaire-alpes.fr");
const ines = c("Inès Ferreira", "ines@coworkingcafe.fr");
const pauline = c("Pauline Girard", "pauline@nomade-coworking.fr");
const urssaf = c("Urssaf", "noreply@urssaf.fr");
const qonto = c("Qonto", "hello@qonto.com");
const lomi = c("Café Lomi", "commandes@cafelomi.com");
const maif = c("MAIF Pro", "pro@maif.fr");
const linkedin = c("LinkedIn", "messages-noreply@linkedin.com");

const raphael = c("Raphaël Ott", "raph@ott.dev");
const linear = c("Linear", "noreply@linear.app");
const sentry = c("Sentry", "noreply@sentry.io");
const npmjs = c("npm", "support@npmjs.com");
const cloudflare = c("Cloudflare", "noreply@cloudflare.com");
const appledev = c("Apple Developer", "developer@apple.com");
const supabase = c("Supabase", "no-reply@supabase.io");

let seq = 0;
const id = (prefix: string) => `${prefix}-${++seq}`;

/**
 * A previewable image without a byte of binary in the repository: an SVG
 * gradient as a `data:` URI. Real attachments will carry their own bytes;
 * what matters here is that the preview has something true to display.
 */
function photo(name: string, hue: number, caption: string, size = 2_400_000): Attachment {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="oklch(0.72 0.16 ${hue})"/>
<stop offset="100%" stop-color="oklch(0.52 0.19 ${(hue + 45) % 360})"/>
</linearGradient></defs>
<rect width="1200" height="800" fill="url(#g)"/>
<text x="60" y="740" font-family="system-ui,sans-serif" font-size="48" fill="rgba(255,255,255,0.92)">${caption}</text>
</svg>`;
  return {
    id: id("att"),
    name,
    mime: "image/svg+xml",
    /* The weight a photo would have; the SVG's own byte count would show a
       holiday snap at 444 o and make every size on screen a lie. */
    size,
    url: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
  };
}

/** A document the mock cannot show: the preview says so instead of pretending. */
function document_(name: string, mime: string, size: number): Attachment {
  return { id: id("att"), name, mime, size };
}

function thread(
  spaceId: Thread["spaceId"],
  folder: Thread["folder"],
  subject: string,
  messages: Array<{
    from: Contact;
    to: Contact[];
    hoursAgo: number;
    body: string;
    /** Le corps HTML, comme un vrai fournisseur le rend : déjà lavé. */
    html?: string;
    /** Combien d'images distantes ont été retenues au lavage. */
    blockedImages?: number;
    attachments?: Attachment[];
  }>,
  opts: Partial<Pick<Thread, "labels" | "unread" | "starred">> = {},
): Thread {
  const msgs = messages.map((m) => ({
    id: id("msg"),
    from: m.from,
    to: m.to,
    date: ago(m.hoursAgo),
    body: m.body.trim(),
    html: m.html,
    blockedImages: m.blockedImages,
    attachments: m.attachments,
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
  /* **La seule infolettre du jeu**, et elle est là pour ça : sans un message
     HTML, tout un chemin restait invérifiable — le bac à sable, la hauteur que
     le cadre rapporte, le bandeau des images retenues, et le relais des
     touchers qui rend son geste de retour au mail ouvert. Le HTML est écrit
     comme `html.ts` le rend : pas de script, images distantes en `data-src`. */
  thread(
    "perso",
    "inbox",
    "Les bons plans du mois",
    [
      {
        from: laposte,
        to: [ME.perso],
        hoursAgo: 5,
        body: "Voir la version en ligne — Les bons plans du mois",
        blockedImages: 2,
        /* **Une largeur fixe, comme les vraies.** Le gabarit à `max-width` se
           repliait tout seul et ne testait donc rien : les infolettres du monde
           réel posent un tableau de 600 px qui déborde d'un téléphone, et c'est
           ce cas-là qu'il faut avoir sous la main (voir `donnees-mock.md`).
           Le `<style>` qui remet `body` à zéro est du même tonneau : `html.ts`
           le garde, il arrive après le nôtre, et c'est lui qui reprenait la
           marge du cadre. */
        html: `<style>body{margin:0;padding:0;background:#f4f4f4}img{border:0}</style>
<table role="presentation" width="600" style="width:600px;margin:0 auto;font-family:Helvetica,Arial,sans-serif;background:#fff"><tr><td>
  <p style="color:#888;font-size:12px">Voir la version en ligne</p>
  <img data-src="https://exemple.invalid/banniere.png" alt="Bannière" width="600" height="180">
  <h1 style="font-size:26px;color:#c0392b">Les bons plans du mois</h1>
  <p>Bonjour, voici notre sélection. Les prix s'entendent hors éco-participation.</p>
  <table role="presentation" width="100%"><tr>
    <td style="padding:8px"><b>Séchoir tour 3 étages</b><br><span style="color:#c0392b;font-size:22px">15,90 €</span></td>
    <td style="padding:8px"><b>Perceuse 20V</b><br><span style="color:#c0392b;font-size:22px">49,90 €</span></td>
  </tr></table>
  <img data-src="https://exemple.invalid/produit.png" alt="Produit" width="280" height="180">
  <p style="text-align:center"><a href="https://exemple.invalid/offres" style="display:inline-block;padding:12px 24px;border:2px solid #2c2c6c;border-radius:24px;color:#2c2c6c;text-decoration:none">Découvrez nos offres</a></p>
  <p style="color:#888;font-size:12px">Vous recevez ce message car vous êtes client. Se désabonner.</p>
</td></tr></table>`,
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

Voici les trois meilleures en pièce jointe, l'album complet suit. Il y a quelques pépites de Marc en train de danser 😂

Bises`,
        attachments: [
          photo("gateau.jpg", 35, "Le gâteau, juste avant", 2_930_000),
          photo("marc-danse.jpg", 300, "Marc, 23 h 40", 1_840_000),
          photo("table.jpg", 140, "La table, avant le passage", 3_410_000),
        ],
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

  thread(
    "perso",
    "inbox",
    "Rappel : rendez-vous mardi 9h30",
    [
      {
        from: doctolib,
        to: [ME.perso],
        hoursAgo: 5,
        body: `Rappel de votre rendez-vous avec le Dr Fabre, mardi à 9h30, 12 rue des Marquisats.

Pensez à apporter vos derniers résultats.`,
      },
    ],
    { unread: true, labels: ["Santé"] },
  ),
  thread(
    "perso",
    "inbox",
    "Tu as vu le vélo sur leboncoin ?",
    [
      {
        from: lucas,
        to: [ME.perso],
        hoursAgo: 6.5,
        body: `Celui dont je te parlais est encore dispo, à 15 min de chez toi. Je lui écris ou tu veux le voir d'abord ?`,
      },
      {
        from: ME.perso,
        to: [lucas],
        hoursAgo: 6,
        body: `Écris-lui, je peux passer samedi matin.`,
      },
      {
        from: lucas,
        to: [ME.perso],
        hoursAgo: 5.5,
        body: `Nickel, il propose samedi 10h. Je te confirme ce soir.`,
      },
    ],
    { labels: ["Amis"] },
  ),
  thread(
    "perso",
    "inbox",
    "Votre facture d'électricité de septembre",
    [
      {
        from: edf,
        to: [ME.perso],
        hoursAgo: 14,
        body: `Votre facture de 68,40 € sera prélevée le 15 septembre sur votre compte habituel.`,
        attachments: [document_("facture-septembre.pdf", "application/pdf", 184_320)],
      },
    ],
    { labels: ["Maison"] },
  ),
  thread(
    "perso",
    "inbox",
    "Ton annonce a reçu un message",
    [
      {
        from: leboncoin,
        to: [ME.perso],
        hoursAgo: 20,
        body: `Un acheteur est intéressé par « Table basse chêne massif ». Réponds vite pour ne pas le perdre.`,
      },
    ],
    { unread: true },
  ),
  thread(
    "perso",
    "inbox",
    "Réunion de copropriété — 24 septembre",
    [
      {
        from: karine,
        to: [ME.perso, claire, marc],
        hoursAgo: 27,
        body: `Bonjour à tous,

L'assemblée se tiendra le 24 à 18h30 dans la salle du rez-de-chaussée. L'ordre du jour porte surtout sur le ravalement et le local à vélos.

Merci de me dire si vous serez présents ou si vous donnez pouvoir.

Karine`,
      },
    ],
    { labels: ["Travaux"] },
  ),
  thread(
    "perso",
    "inbox",
    "Les photos du mariage sont en ligne",
    [
      {
        from: theo,
        to: [ME.perso, claire],
        hoursAgo: 34,
        body: `Bonjour,

La galerie est prête, 380 photos. Le lien est valable trois mois et le téléchargement en pleine résolution est activé.

Théo`,
      },
    ],
    { starred: true, labels: ["Famille"] },
  ),
  thread(
    "perso",
    "inbox",
    "Votre commande est prête en magasin",
    [
      {
        from: decathlon,
        to: [ME.perso],
        hoursAgo: 44,
        body: `Votre commande n° 884120 vous attend au comptoir retrait pendant 14 jours.`,
      },
    ],
    { labels: ["Achats"] },
  ),
  thread(
    "perso",
    "inbox",
    "Inscription cantine — dernier rappel",
    [
      {
        from: mairie,
        to: [ME.perso],
        hoursAgo: 58,
        body: `Les inscriptions à la restauration scolaire se terminent le 12 septembre. Passé cette date, aucune modification ne pourra être prise en compte pour le trimestre.`,
      },
    ],
    { unread: true },
  ),
  thread(
    "perso",
    "inbox",
    "Votre relevé de compte est disponible",
    [
      {
        from: banque,
        to: [ME.perso],
        hoursAgo: 76,
        body: `Votre relevé du mois d'août est consultable dans votre espace personnel.`,
      },
    ],
    { labels: ["Banque"] },
  ),
  thread(
    "perso",
    "inbox",
    "Votre séjour à Chamonix approche",
    [
      {
        from: airbnb,
        to: [ME.perso],
        hoursAgo: 96,
        body: `Plus que quelques jours. Votre hôte Ludivine vous transmettra les instructions d'arrivée la veille.`,
      },
    ],
    { labels: ["Voyage"] },
  ),
  thread(
    "perso",
    "inbox",
    "Playlist de la rentrée",
    [
      {
        from: spotify,
        to: [ME.perso],
        hoursAgo: 120,
        body: `On vous a préparé une sélection à partir de vos écoutes de cet été.`,
      },
    ],
  ),
  thread(
    "perso",
    "inbox",
    "Prêt pour la course de dimanche ?",
    [
      {
        from: marc,
        to: [ME.perso, lucas],
        hoursAgo: 150,
        body: `On part à 8h du parking du lac. J'emmène de quoi ravitailler, pensez juste à vos dossards.`,
      },
      {
        from: ME.perso,
        to: [marc, lucas],
        hoursAgo: 148,
        body: `Ok pour moi. Je serai un peu juste, comptez sur 8h10.`,
      },
    ],
    { labels: ["Sport"] },
  ),
  thread(
    "perso",
    "inbox",
    "Merci pour le week-end",
    [
      {
        from: amelie,
        to: [ME.perso, claire, marc],
        hoursAgo: 200,
        body: `C'était vraiment chouette. On remet ça avant l'hiver ? J'ai encore les photos du lac à vous envoyer.`,
      },
    ],
    { labels: ["Amis"] },
  ),
  thread(
    "perso",
    "archive",
    "Codes du portail et du local vélo",
    [
      {
        from: karine,
        to: [ME.perso],
        hoursAgo: 260,
        body: `Portail : 4821B. Local vélos : 7734. Merci de ne pas les diffuser en dehors de l'immeuble.`,
      },
    ],
    { starred: true, labels: ["Maison"] },
  ),
  thread(
    "perso",
    "snoozed",
    "Renouveler le passeport",
    [
      {
        from: mairie,
        to: [ME.perso],
        hoursAgo: 300,
        body: `Votre pré-demande n° 22PA9081 est enregistrée. Prenez rendez-vous en mairie pour finaliser le dépôt.`,
      },
    ],
  ),
  thread(
    "perso",
    "archive",
    "Confirmation de commande — librairie",
    [
      {
        from: c("Librairie du Lac", "commandes@librairiedulac.fr"),
        to: [ME.perso],
        hoursAgo: 420,
        body: `Vos trois ouvrages sont réservés à votre nom jusqu'au 20 septembre.`,
      },
    ],
  ),
  thread(
    "perso",
    "trash",
    "Vous avez gagné un séjour !",
    [
      {
        from: c("Jeu Concours", "gagnant@promo-vacances.net"),
        to: [ME.perso],
        hoursAgo: 500,
        body: `Cliquez vite pour réclamer votre séjour tous frais payés.`,
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
        attachments: [
          document_("devis-salle-reunion-v2.pdf", "application/pdf", 412_000),
          photo("plan-1er-etage.png", 230, "Plan du 1ᵉʳ étage — cloisons vitrées", 780_000),
        ],
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

  thread(
    "pro",
    "inbox",
    "Bilan intermédiaire — pièces manquantes",
    [
      {
        from: laurent,
        to: [ME.pro],
        hoursAgo: 2.5,
        body: `Bonjour Thierry,

Il me manque les relevés de juillet et les justificatifs de deux notes de frais (déplacement Lyon, matériel Bureau Vallée) pour boucler le point d'étape.

Si vous pouvez me les déposer avant vendredi, je tiens les délais.

Cordialement,
Laurent Bouvier`,
      },
    ],
    { unread: true, labels: ["Compta"] },
  ),
  thread(
    "pro",
    "inbox",
    "Planning des permanences — semaine 38",
    [
      {
        from: ines,
        to: [ME.pro, sophie],
        hoursAgo: 4,
        body: `Coucou,

J'ai mis à jour le planning. Il me manque quelqu'un le jeudi soir, Sophie est en congé.

Je peux décaler ma fermeture si besoin.

Inès`,
      },
      {
        from: sophie,
        to: [ME.pro, ines],
        hoursAgo: 3.4,
        body: `Je peux prendre le jeudi soir finalement, mon rendez-vous a été déplacé.`,
      },
    ],
    { labels: ["Équipe"] },
  ),
  thread(
    "pro",
    "inbox",
    "Votre déclaration est en ligne",
    [
      {
        from: urssaf,
        to: [ME.pro],
        hoursAgo: 9,
        body: `Votre déclaration du 3e trimestre est disponible. Date limite de paiement : 30 septembre.`,
      },
    ],
    { unread: true, labels: ["Compta"] },
  ),
  thread(
    "pro",
    "inbox",
    "Demande de devis — séminaire 20 personnes",
    [
      {
        from: pauline,
        to: [ME.pro],
        hoursAgo: 12,
        body: `Bonjour,

Nous cherchons un lieu pour une journée d'équipe mi-octobre, 20 personnes, avec un espace de travail et de quoi déjeuner sur place.

Auriez-vous des disponibilités et un ordre de prix ?

Bien à vous,
Pauline Girard`,
      },
    ],
    { unread: true, starred: true, labels: ["Clients"] },
  ),
  thread(
    "pro",
    "inbox",
    "Virement reçu — 1 240,00 €",
    [
      {
        from: qonto,
        to: [ME.pro],
        hoursAgo: 18,
        body: `Un virement de 1 240,00 € de STUDIO NORD SARL a été crédité sur votre compte professionnel.`,
      },
    ],
    { labels: ["Banque"] },
  ),
  thread(
    "pro",
    "inbox",
    "Commande de café — livraison décalée",
    [
      {
        from: lomi,
        to: [ME.pro],
        hoursAgo: 25,
        body: `Bonjour,

Votre commande de 12 kg part finalement lundi, notre torréfaction de jeudi a pris du retard. Livraison mardi matin.

Désolés pour le décalage.`,
      },
    ],
    { labels: ["Fournisseurs"] },
  ),
  thread(
    "pro",
    "inbox",
    "Attestation d'assurance 2026",
    [
      {
        from: maif,
        to: [ME.pro],
        hoursAgo: 40,
        body: `Votre attestation multirisque professionnelle est disponible dans votre espace client.`,
      },
    ],
  ),
  thread(
    "pro",
    "inbox",
    "Un profil correspond à votre annonce",
    [
      {
        from: linkedin,
        to: [ME.pro],
        hoursAgo: 50,
        body: `3 nouvelles candidatures pour « Chargé·e d'accueil — mi-temps ».`,
      },
    ],
    { labels: ["Recrutement"] },
  ),
  thread(
    "pro",
    "inbox",
    "Retour sur la journée portes ouvertes",
    [
      {
        from: sophie,
        to: [ME.pro],
        hoursAgo: 62,
        body: `On a compté 74 visiteurs et 9 demandes d'essai. Le créneau du samedi matin marche beaucoup mieux que le vendredi soir.

Je te fais un récap chiffré lundi.`,
      },
    ],
    { starred: true, labels: ["Équipe"] },
  ),
  thread(
    "pro",
    "inbox",
    "Panne machine à café — intervention",
    [
      {
        from: c("Alpes Maintenance", "sav@alpes-maintenance.fr"),
        to: [ME.pro],
        hoursAgo: 88,
        body: `Un technicien passera mercredi entre 8h et 10h. Merci de laisser l'accès libre au local technique.`,
      },
    ],
  ),
  thread(
    "pro",
    "inbox",
    "Renouvellement des abonnements mensuels",
    [
      {
        from: ines,
        to: [ME.pro],
        hoursAgo: 130,
        body: `Sur les 31 abonnés, 27 ont reconduit. Deux départs pour déménagement, deux sans réponse — je relance ?`,
      },
    ],
    { labels: ["Clients"] },
  ),
  thread(
    "pro",
    "inbox",
    "Proposition de partenariat — torréfacteur local",
    [
      {
        from: c("Brûlerie des Alpes", "contact@bruleriedesalpes.fr"),
        to: [ME.pro],
        hoursAgo: 190,
        body: `Bonjour,

Nous fournissons plusieurs lieux du centre et cherchons à nous rapprocher d'espaces comme le vôtre. Nous pourrions vous proposer une dégustation sur place.

Bien cordialement`,
      },
    ],
    { labels: ["Fournisseurs"] },
  ),
  thread(
    "pro",
    "inbox",
    "Bail commercial — clauses à revoir",
    [
      {
        from: c("Cabinet Rivière", "contact@cabinet-riviere.fr"),
        to: [ME.pro],
        hoursAgo: 240,
        body: `Comme évoqué, deux points méritent une négociation avant signature : la répartition des charges de ravalement et la durée du préavis.`,
      },
    ],
    { starred: true },
  ),
  thread(
    "pro",
    "snoozed",
    "Devis enseigne lumineuse",
    [
      {
        from: c("Signal Déco", "devis@signaldeco.fr"),
        to: [ME.pro],
        hoursAgo: 320,
        body: `Notre proposition pour l'enseigne façade, pose comprise, s'élève à 2 180 € HT. Validité 60 jours.`,
      },
    ],
  ),
  thread(
    "pro",
    "sent",
    "Re: Demande de devis — séminaire 20 personnes",
    [
      {
        from: ME.pro,
        to: [pauline],
        hoursAgo: 11,
        body: `Bonjour Pauline,

Merci pour votre message. La salle Atelier accueille 20 personnes en configuration réunion, et nous pouvons organiser le déjeuner sur place.

Je vous joins deux formules et nos disponibilités d'octobre.

Bien à vous,
Thierry`,
      },
    ],
  ),
  thread(
    "pro",
    "archive",
    "Facture d'électricité — local commercial",
    [
      {
        from: edf,
        to: [ME.pro],
        hoursAgo: 460,
        body: `Votre facture professionnelle de 312,70 € a bien été réglée par prélèvement.`,
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
    "inbox",
    "Erreur en production : TypeError sur /thread",
    [
      {
        from: sentry,
        to: [ME.side],
        hoursAgo: 0.8,
        body: `Cannot read properties of undefined (reading 'messages')

12 événements sur 4 utilisateurs, première occurrence il y a 40 minutes.`,
      },
    ],
    { unread: true, labels: ["Dev"] },
  ),
  thread(
    "side",
    "inbox",
    "Déploiement réussi — arc-mail (preview)",
    [
      {
        from: vercel,
        to: [ME.side],
        hoursAgo: 2,
        body: `La branche preview est en ligne. Build en 38 s, aucune alerte.`,
      },
    ],
  ),
  thread(
    "side",
    "inbox",
    "ARC-42 t'a été assignée",
    [
      {
        from: linear,
        to: [ME.side],
        hoursAgo: 4.5,
        body: `« Le geste de fermeture rouvre la feuille sur un petit mouvement » — priorité haute, cycle en cours.`,
      },
    ],
    { unread: true, labels: ["Dev"] },
  ),
  thread(
    "side",
    "inbox",
    "Un retour sur la bêta",
    [
      {
        from: raphael,
        to: [ME.side],
        hoursAgo: 7,
        body: `Salut,

J'ai installé sur iPhone, c'est bluffant de fluidité. Deux détails : la barre de recherche part un peu trop haut quand le clavier sort, et j'aimerais pouvoir renommer un espace.

Sinon rien à dire, le glissement depuis le bord est parfait.

Raph`,
      },
      {
        from: ME.side,
        to: [raphael],
        hoursAgo: 6.2,
        body: `Merci ! Le clavier est corrigé sur preview. Le renommage arrive avec le multi-comptes.`,
      },
    ],
    { starred: true },
  ),
  thread(
    "side",
    "inbox",
    "Votre certificat SSL a été renouvelé",
    [
      {
        from: cloudflare,
        to: [ME.side],
        hoursAgo: 16,
        body: `Le certificat de twe-ux.dev est valide jusqu'au 3 décembre. Aucune action requise.`,
      },
    ],
  ),
  thread(
    "side",
    "inbox",
    "[twe-ux/arc-mail] CI failed on preview",
    [
      {
        from: github,
        to: [ME.side],
        hoursAgo: 22,
        body: `Le job « lint » a échoué sur le commit 4f2a1c8.

  src/components/arc/thread-view.tsx:88 — 'label' is defined but never used.`,
      },
    ],
    { unread: true, labels: ["GitHub"] },
  ),
  thread(
    "side",
    "inbox",
    "Votre base atteint 80 % du quota",
    [
      {
        from: supabase,
        to: [ME.side],
        hoursAgo: 30,
        body: `Le projet arc-mail-dev utilise 401 Mo sur 500 Mo. Pensez à purger les tables de test.`,
      },
    ],
  ),
  thread(
    "side",
    "inbox",
    "Nouvelle version de @radix-ui disponible",
    [
      {
        from: npmjs,
        to: [ME.side],
        hoursAgo: 46,
        body: `radix-ui 1.4.3 corrige un problème de focus dans Dialog lors d'une fermeture animée.`,
      },
    ],
    { labels: ["Dev"] },
  ),
  thread(
    "side",
    "inbox",
    "Rappel : expiration du certificat de distribution",
    [
      {
        from: appledev,
        to: [ME.side],
        hoursAgo: 70,
        body: `Votre certificat expire dans 30 jours. Renouvelez-le pour continuer à publier des mises à jour.`,
      },
    ],
    { labels: ["iOS"] },
  ),
  thread(
    "side",
    "inbox",
    "On se fait un point mercredi ?",
    [
      {
        from: julien,
        to: [ME.side],
        hoursAgo: 100,
        body: `J'aimerais te montrer les écrans du composeur avant d'aller plus loin. 30 min en visio suffiraient.`,
      },
    ],
    { labels: ["Design"] },
  ),
  thread(
    "side",
    "inbox",
    "Sondage : quel fournisseur mail en premier ?",
    [
      {
        from: raphael,
        to: [ME.side, julien],
        hoursAgo: 160,
        body: `Entre Gmail et IMAP générique, mon vote va à Gmail : plus de monde à tester, et l'API est mieux documentée.`,
      },
      {
        from: julien,
        to: [ME.side, raphael],
        hoursAgo: 155,
        body: `D'accord avec Raph. IMAP ensuite, ça couvrira le reste.`,
      },
    ],
  ),
  thread(
    "side",
    "archive",
    "Notes d'archi — interface MailProvider",
    [
      {
        from: ME.side,
        to: [ME.side],
        hoursAgo: 210,
        body: `listThreads / getThread / send / modify. Le mock devient la première implémentation, le reste ne connaît que l'interface.`,
      },
    ],
    { starred: true, labels: ["Dev"] },
  ),
  thread(
    "side",
    "snoozed",
    "Migration vers le nouveau runtime",
    [
      {
        from: vercel,
        to: [ME.side],
        hoursAgo: 280,
        body: `Le runtime edge legacy sera retiré le 1er novembre. Vos projets devront être redéployés d'ici là.`,
      },
    ],
  ),
  thread(
    "side",
    "sent",
    "Re: Maquette v3 — écran de lecture",
    [
      {
        from: ME.side,
        to: [julien],
        hoursAgo: 7,
        body: `J'ai intégré la v3. Les actions flottantes fonctionnent bien au pouce, je garde ta version.`,
      },
    ],
  ),
  thread(
    "side",
    "drafts",
    "Changelog 0.4 — cartes flottantes",
    [
      {
        from: ME.side,
        to: [],
        hoursAgo: 3,
        body: `Menu, composeur et recherche partagent maintenant la même marge et les mêmes arrondis. Les listes s'effacent en bas au lieu d'être coupées.`,
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
  thread(
    "side",
    "trash",
    "Boostez votre SEO en 7 jours",
    [
      {
        from: c("SEO Growth", "contact@seo-growth-pro.net"),
        to: [ME.side],
        hoursAgo: 600,
        body: `Nos experts placent votre site en première page, garanti.`,
      },
    ],
  ),
];
