#!/usr/bin/env node
/**
 * Captures d'un écran d'Arc Mail, aux deux tailles et aux deux thèmes, dans la même passe.
 *
 *   npm run capture -- --name composeur [--open menu|…|fil|rail|masquee|volet-message] [--space pro]
 *                      [--densite compact]
 *                      [--url http://localhost:3000] [--out captures] [--dark-only|--light-only]
 *
 * Téléphone : 393×852 à ×3 avec les insets d'un iPhone à encoche (59 haut / 34 bas) posés en
 * CDP — sans eux `env(safe-area-inset-*)` vaut 0 et rien n'est représentatif. Bureau : 1280×800.
 * Imprime les erreurs de page et de console (doit être 0) et, avec --open, la géométrie de la
 * carte : marges gauche / droite / bas et rayon, les quatre chiffres que les fiches fixent.
 *
 * `playwright-core` seulement : pas de téléchargement de navigateur. Le Chromium vient de
 * CHROMIUM_PATH, sinon du Chromium préinstallé des sessions distantes, sinon de Chrome sur Mac.
 */
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { chromium } from "playwright-core";

const args = Object.fromEntries(
  process.argv.slice(2).map((a, i, all) => {
    if (!a.startsWith("--")) return [];
    const key = a.slice(2);
    const next = all[i + 1];
    return [key, next && !next.startsWith("--") ? next : true];
  }).filter((p) => p.length),
);

const url = args.url ?? "http://localhost:3000";
const out = args.out ?? "captures";
const name = args.name ?? "ecran";
const open = args.open; // menu | reglages | compose | search | fil | piece-jointe
const space = args.space; // perso | pro | side
const themes = args["dark-only"] ? ["dark"] : args["light-only"] ? ["light"] : ["light", "dark"];
/* `--densite compact` pose la densité **avant la première peinture**, comme
   l'app la persiste : c'est le seul moyen de photographier une rangée de deux
   lignes, le réglage vivant dans une feuille qu'on aurait sinon à ouvrir. */
const densite = args.densite === "compact" ? "compact" : "confort";

function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const root = "/opt/pw-browsers";
  if (existsSync(root)) {
    const dir = readdirSync(root).find((d) => /^chromium-\d+$/.test(d));
    if (dir) return `${root}/${dir}/chrome-linux/chrome`;
  }
  const mac = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (existsSync(mac)) return mac;
  throw new Error("Aucun Chromium trouvé : donner CHROMIUM_PATH.");
}

const SIZES = {
  mobile: { viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, insets: { top: 59, bottom: 34 } },
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, isMobile: false, hasTouch: false },
};

/* Une valeur peut être une suite d'étapes ; 700 ms entre chacune, le temps qu'une carte
   ou un volet finisse d'entrer. Les trois cartes n'existent que sur téléphone ; `fil` et
   `piece-jointe` valent aux deux tailles (le volet d'aperçu est une vue bureau). */
const CLICK_TEXT = (text) =>
  `[...document.querySelectorAll('button')].find((b) => b.textContent?.includes(${JSON.stringify(text)}))?.click()`;

/**
 * Le même clic, mais **sur ce qui est à l'écran**.
 *
 * Les deux tailles cohabitent dans le document — la barre latérale est
 * `hidden md:flex`, la feuille du téléphone est portalisée — et `querySelector`
 * ne connaît pas `md:`. En cherchant « Indésirable » sur 393 px, on tombait sur
 * la rangée **de la barre bureau**, invisible mais première dans l'ordre du
 * document : le dossier changeait bien (son `onClick` part quand même) mais la
 * feuille ne se refermait pas, puisque c'est *sa* rangée qui la referme. La
 * capture montrait donc un écran que personne ne peut obtenir au doigt.
 *
 * `offsetParent` est nul dès qu'un ancêtre est `display: none` — c'est le test
 * le plus court qui distingue les deux mondes.
 */
const CLICK_VISIBLE = (text) =>
  `[...document.querySelectorAll('button')].find((b) => b.offsetParent !== null && b.textContent?.includes(${JSON.stringify(text)}))?.click()`;

/* Les trois états de la barre se commutent depuis la **tête de liste** : le
   sélecteur y vit désormais, et la barre n'a plus de rangée du haut. */
const RAIL = `document.querySelector('div[role="group"][aria-label="Barre latérale"] button[aria-label^="Réduire en rail"]')?.click()`;
const MASQUEE = `document.querySelector('div[role="group"][aria-label="Barre latérale"] button[aria-label^="Masquer"]')?.click()`;

/**
 * Ouvrir la feuille Dossiers, **sur téléphone seulement**.
 *
 * Elle est le seul chemin vers un dossier non épinglé là-bas ; sur bureau la
 * barre le porte déjà. Et il faut vraiment la condition : sur 1280 px la
 * feuille est `md:hidden` mais Radix la porte quand même dans le document, et
 * son voile avalait le clic suivant — la capture bureau restait sur la
 * réception sans rien signaler.
 */
const SHEET_IF_PHONE = `innerWidth < 768 && document.querySelector('nav[aria-label="Navigation"] button[aria-label="Dossiers"]')?.click()`;

const OPENERS = {
  /* La case d'espace de la barre **change** d'espace depuis le lot mobile ;
     c'est « Dossiers » qui ouvre la feuille. */
  menu: `document.querySelector('nav[aria-label="Navigation"] button[aria-label="Dossiers"]')?.click()`,
  reglages: `document.querySelector('nav[aria-label="Navigation"] button[aria-label="Personnaliser"]')?.click()`,
  compose: `document.querySelector('nav[aria-label="Navigation"] button[aria-label="Écrire"]')?.click()`,
  search: `document.querySelector('nav[aria-label="Navigation"] button[aria-label="Rechercher"]')?.click()`,
  fil: [CLICK_TEXT("Photos de l'anniversaire")],
  /* Le dossier des indésirables. Une seule suite pour les deux tailles : sur
     téléphone la première étape ouvre la feuille Dossiers (le dossier n'est pas
     dans les quatre épinglés), sur bureau elle ne trouve rien et la seconde
     clique la rangée de la barre. */
  indesirable: [SHEET_IF_PHONE, CLICK_VISIBLE("Indésirable")],
  /* Un dossier **réellement** vide : l'espace Pro n'a pas de brouillon dans le
     mock (« En pause » en a deux — vérifié en comptant, pas en supposant). */
  vide: [SHEET_IF_PHONE, CLICK_VISIBLE("Brouillons")],
  /* Le dialogue « Nouvel espace », depuis la tuile « + » de la barre. */
  "nouvel-espace": [`document.querySelector('button[aria-label="Nouvel espace"]')?.click()`],
  /* Le fil pris à tort par le filtre, et le menu qui le réhabilite. */
  "indesirable-plus": [
    SHEET_IF_PHONE,
    CLICK_VISIBLE("Indésirable"),
    CLICK_VISIBLE("Devis chantier Marquisats"),
    /* « Plus » dans la pill du téléphone, « Plus d'actions » dans l'en-tête du
       bureau : un préfixe plutôt qu'une apostrophe, qui refermait la chaîne du
       sélecteur — et le premier **visible**, pour la même raison que
       `CLICK_VISIBLE`. */
    `[...document.querySelectorAll('button[aria-label^="Plus"]')].find((b) => b.offsetParent !== null)?.click()`,
  ],
  /* **Tout ce qui vient de la même personne.** La Poste a deux fils dans la
     réception Perso du mock (compté dans la vue par correspondant, pas
     supposé) : c'est la seule condition pour que la rangée existe. */
  "tout-de": [
    CLICK_TEXT("Votre colis est en route"),
    `[...document.querySelectorAll('button[aria-label^="Plus"]')].find((b) => b.offsetParent !== null)?.click()`,
  ],
  /* La suite du même geste : la sélection remplie, puis les étiquettes. */
  "selection-etiquettes": [
    CLICK_TEXT("Votre colis est en route"),
    `[...document.querySelectorAll('button[aria-label^="Plus"]')].find((b) => b.offsetParent !== null)?.click()`,
    CLICK_VISIBLE("Tout de La Poste"),
    `[...document.querySelectorAll('button[aria-label="Étiqueter"]')].find((b) => b.offsetParent !== null)?.click()`,
  ],
  /* Le fil qui porte des citations : c'est celui qui montre le repli et, en
     mode discussion, l'alternance des deux côtés. */
  discussion: [CLICK_TEXT("Tu as vu le vélo sur leboncoin ?")],
  /* Le fil qui porte la **feuille blanche** : un mot, puis une signature en
     couleur — le courrier le plus courant du monde professionnel. */
  formes: [CLICK_TEXT("Planning des événements de septembre")],
  /* Répondre depuis une bulle : le composeur ouvre le volet de droite. Le ↩ est
     transparent au repos (il se révèle au survol) mais bien dans le DOM. */
  "reponse-volet": [
    CLICK_TEXT("Planning des événements de septembre"),
    `document.querySelector('button[aria-label^="Répondre à"]')?.click()`,
  ],
  "piece-jointe": [
    CLICK_TEXT("Photos de l'anniversaire"),
    `document.querySelector('button[aria-pressed] img')?.closest('button')?.click()`,
  ],
  /* Bureau : la barre réduite en rail, puis masquée — les deux états où la
     tête de liste reprend ce que la barre portait. */
  rail: [RAIL],
  masquee: [
    RAIL,
    MASQUEE,
  ],
  /* Bureau : un courrier HTML, barre masquée — le volet occupe tout. */
  "html-large": [
    RAIL,
    MASQUEE,
    CLICK_TEXT("Les bons plans du mois"),
  ],
  /* Le mail ouvert sur une infolettre : le cas qui met la mise en page a
     l'epreuve — HTML large, mis a la largeur, avec ses images retenues. */
  infolettre: [CLICK_TEXT("Les bons plans du mois")],
  /* La vue par correspondant, premier niveau : les gens. Le bouton vit dans la
     tête de liste des deux côtés. */
  correspondants: [`document.querySelector('button[aria-label="Ranger par correspondant"]')?.click()`],
  /* La même vue, barre masquée : la liste prend toute la fenêtre. */
  "correspondants-large": [
    RAIL,
    MASQUEE,
    `document.querySelector('button[aria-label="Ranger par correspondant"]')?.click()`,
  ],
  /* Bureau : la fenêtre du composeur, posée sur la boîte. */
  composeur: [`document.querySelector('button[aria-label="Nouveau message"]')?.click()`],
  /* Bureau : le troisième volet, sur un message détaché du fil. */
  "volet-message": [
    RAIL,
    CLICK_TEXT("Photos de l'anniversaire"),
    `document.querySelector('button[aria-label^="Ouvrir le message de"]')?.click()`,
  ],
};

/** Les écrans qui ne sont pas des cartes flottantes : rien à mesurer, mais à capturer partout. */
const BOTH_SIZES = new Set(["fil", "discussion", "formes", "reponse-volet", "infolettre", "piece-jointe", "rail", "masquee", "volet-message", "composeur", "html-large", "correspondants", "correspondants-large", "indesirable", "indesirable-plus", "vide", "nouvel-espace", "tout-de", "selection-etiquettes"]);

const CARD = `(() => {
  const el = document.querySelector('[data-slot="sheet-content"], [data-slot="dialog-content"]');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const round = (n) => Math.round(n * 100) / 100;
  return {
    gauche: round(r.left), droite: round(innerWidth - r.right), bas: round(innerHeight - r.bottom),
    haut: round(r.top), rayon: getComputedStyle(el).borderTopLeftRadius,
  };
})()`;

async function main() {
  try {
    await fetch(url);
  } catch {
    console.error(`Rien ne répond sur ${url} — lancer \`npm run dev\` d'abord.`);
    process.exit(1);
  }
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: chromiumPath() });
  const problems = [];
  let total = 0;

  for (const [size, cfg] of Object.entries(SIZES)) {
    for (const theme of themes) {
      const ctx = await browser.newContext({
        viewport: cfg.viewport,
        deviceScaleFactor: cfg.deviceScaleFactor,
        isMobile: cfg.isMobile,
        hasTouch: cfg.hasTouch,
        colorScheme: theme,
      });
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(`page: ${e.message}`));
      page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
      if (cfg.insets) {
        const cdp = await ctx.newCDPSession(page);
        await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: { left: 0, right: 0, ...cfg.insets } });
      }
      /* Le thème est lu dans localStorage avant la première peinture (layout.tsx) : on le
         pose comme l'app le persisterait, pour capturer le vrai chemin et non une classe forcée. */
      /* **L'espace se pose ici, avec le thème.** Il passait par la feuille du
         téléphone — laquelle ne choisit plus le compte depuis que les espaces
         sont dans la barre du bas : le bouton n'existait plus, le clic ne
         trouvait rien, et toutes les captures `--space pro` rendaient Perso
         sans rien dire. Persisté comme l'app le persiste, il vaut aussi sur
         bureau, où il n'y avait aucun chemin du tout. */
      await page.addInitScript(({ dark, densite, espace }) => {
        /* `addInitScript` s'exécute dans **tous** les cadres, y compris l'iframe
           en bac à sable d'un message HTML — qui n'a pas d'origine, donc pas de
           `localStorage`, et l'accès y lève. C'était l'outil de mesure qui
           signalait une erreur de page, pas l'app. */
        if (window.top !== window.self) return;
        const raw = localStorage.getItem("arc-mail");
        const state = raw ? JSON.parse(raw) : { state: {}, version: 0 };
        state.state = { themes: {}, splitView: true, recent: { perso: [], pro: [], side: [] }, ...state.state, dark, listDensity: densite };
        if (espace) state.state.spaceId = espace;
        localStorage.setItem("arc-mail", JSON.stringify(state));
      }, { dark: theme === "dark", densite, espace: space && space !== true ? String(space) : null });
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);

      if (open && OPENERS[open] && (size === "mobile" || BOTH_SIZES.has(open))) {
        const steps = Array.isArray(OPENERS[open]) ? OPENERS[open] : [OPENERS[open]];
        for (const [i, step] of steps.entries()) {
          await page.evaluate(step);
          /* L'animation d'entrée dure 400 ms (fiche cartes-flottantes) ; mesurée pendant qu'elle
             joue, la carte est encore quelques pixels trop bas et cela ressemble à un bug. */
          await page.waitForTimeout(i === steps.length - 1 ? 1100 : 700);
        }
      }

      const file = `${out}/${name}-${size}-${theme}.png`;
      await page.screenshot({ path: file });
      total++;
      const card = open && size === "mobile" && !BOTH_SIZES.has(open) ? await page.evaluate(CARD) : null;
      const line = [`${file}`, card ? `carte ${JSON.stringify(card)}` : null, errors.length ? `ERREURS ${errors.length}` : "erreurs 0"]
        .filter(Boolean).join("  ·  ");
      console.log(line);
      for (const e of errors) problems.push(`${size}/${theme}: ${e}`);
      await ctx.close();
    }
  }
  await browser.close();
  console.log(`\n${total} capture(s) dans ${out}/ — erreurs : ${problems.length}`);
  for (const p of problems) console.log("  " + p);
  process.exit(problems.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
