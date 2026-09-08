/**
 * Les boîtes qu'on sait brancher, et ce qu'il faut savoir pour chacune.
 *
 * Les hôtes ne se devinent pas et se tapent mal : `imap.gmail.com` avec un
 * `s` de trop, c'est une erreur de connexion qui ressemble à un mauvais mot de
 * passe. On les pose, et « Autre » reste pour tout le reste.
 *
 * **Ni l'un ni l'autre n'ouvre d'API sur simple connexion** : Apple n'en a
 * pas, et Google en a une mais qui demande son propre consentement. Dans les
 * deux cas, ce qui ouvre la boîte est un mot de passe d'application, et il
 * s'écrit ici.
 */
export const FOURNISSEURS = {
  icloud: {
    nom: "iCloud",
    domaines: ["icloud.com", "me.com", "mac.com"],
    imapHost: "imap.mail.me.com",
    imapPort: "993",
    /* 587 pour iCloud : la session commence en clair et monte en TLS. */
    smtpHost: "smtp.mail.me.com",
    smtpPort: "587",
    exemple: "prenom@icloud.com",
    lien: "https://account.apple.com",
    lienNom: "mot de passe d'application",
    aide: "Apple n'ouvre pas d'API : on passe par IMAP.",
  },
  gmail: {
    nom: "Gmail",
    domaines: ["gmail.com", "googlemail.com"],
    imapHost: "imap.gmail.com",
    imapPort: "993",
    /* 465 pour Google : le chiffrement dès la poignée de main. */
    smtpHost: "smtp.gmail.com",
    smtpPort: "465",
    exemple: "prenom@gmail.com",
    lien: "https://myaccount.google.com/apppasswords",
    lienNom: "mot de passe d'application",
    /* Depuis le 8 sept. la porte n'offre plus « Continuer avec Google », donc
       cette phrase ne corrige plus un bouton trompeur — elle prévient la
       question que se pose quand même quiconque a un compte Google. */
    aide: "Gmail s'ouvre par IMAP, la validation en deux étapes activée — pas par le compte Google.",
  },
  autre: {
    nom: "Autre",
    domaines: [] as string[],
    imapHost: "",
    imapPort: "993",
    smtpHost: "",
    smtpPort: "587",
    exemple: "prenom@domaine.fr",
    lien: "",
    lienNom: "",
    aide: "N'importe quelle boîte IMAP : il faut ses serveurs, que ton hébergeur publie.",
  },
} as const;

export type Fournisseur = keyof typeof FOURNISSEURS;

/** Celui de l'adresse connectée, quand on le reconnaît : une case de moins à remplir. */
export function fournisseurDe(email: string | null): Fournisseur {
  const domaine = (email ?? "").split("@")[1]?.toLowerCase() ?? "";
  const trouve = (Object.keys(FOURNISSEURS) as Fournisseur[]).find((cle) =>
    (FOURNISSEURS[cle].domaines as readonly string[]).includes(domaine),
  );
  return trouve ?? "icloud";
}
