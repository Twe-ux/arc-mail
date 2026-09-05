#!/usr/bin/env node
/**
 * Captures d'un écran d'Arc Mail, aux deux tailles et aux deux thèmes, dans la même passe.
 *
 *   npm run capture -- --name composeur [--open menu|reglages|compose|search|fil|piece-jointe] [--space pro]
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

const OPENERS = {
  /* La case d'espace de la barre **change** d'espace depuis le lot mobile ;
     c'est « Dossiers » qui ouvre la feuille. */
  menu: `document.querySelector('nav[aria-label="Navigation"] button[aria-label="Dossiers"]')?.click()`,
  reglages: `document.querySelector('nav[aria-label="Navigation"] button[aria-label="Personnaliser"]')?.click()`,
  compose: `document.querySelector('nav[aria-label="Navigation"] button[aria-label="Écrire"]')?.click()`,
  search: `document.querySelector('nav[aria-label="Navigation"] button[aria-label="Rechercher"]')?.click()`,
  fil: [CLICK_TEXT("Photos de l'anniversaire")],
  "piece-jointe": [
    CLICK_TEXT("Photos de l'anniversaire"),
    `document.querySelector('button[aria-pressed] img')?.closest('button')?.click()`,
  ],
};

/** Les écrans qui ne sont pas des cartes flottantes : rien à mesurer, mais à capturer partout. */
const BOTH_SIZES = new Set(["fil", "piece-jointe"]);

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
      await page.addInitScript((dark) => {
        const raw = localStorage.getItem("arc-mail");
        const state = raw ? JSON.parse(raw) : { state: {}, version: 0 };
        state.state = { themes: {}, splitView: true, recent: { perso: [], pro: [], side: [] }, ...state.state, dark };
        localStorage.setItem("arc-mail", JSON.stringify(state));
      }, theme === "dark");
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);

      if (space && size === "mobile") {
        await page.evaluate(OPENERS.menu);
        await page.waitForTimeout(700);
        await page.evaluate((s) => {
          [...document.querySelectorAll("button[aria-pressed]")].find((b) => b.textContent.toLowerCase().includes(s))?.click();
        }, space.toLowerCase());
        await page.waitForTimeout(400);
        if (open !== "menu") {
          await page.evaluate(() => document.querySelector('button[aria-label="Fermer"]')?.click());
          await page.waitForTimeout(600);
        }
      }
      if (open && OPENERS[open] && (size === "mobile" || BOTH_SIZES.has(open))) {
        const steps = Array.isArray(OPENERS[open]) ? OPENERS[open] : [OPENERS[open]];
        for (const [i, step] of steps.entries()) {
          if (space && open === "menu" && i === 0) continue;
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
