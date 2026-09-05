"use client";

import { ImageOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { TouchRelaye } from "@/hooks/use-edge-swipe-back";
import type { Message } from "@/lib/types";
import { useRelaisRetour } from "./back-swipe";

/**
 * Le corps d'un message : son HTML quand il en a un, son texte sinon.
 *
 * **Dans une `iframe` en bac à sable, jamais dans la page.** Le HTML a beau
 * être lavé côté serveur ([`html.ts`](../../lib/mail/html.ts)), l'injecter ici
 * ferait dépendre toute l'app de la qualité d'un filtre. Le cadre lui donne une
 * origine opaque : pas de script à lui, pas d'accès à la page, pas de cookies,
 * et son CSS ne peut pas déborder sur le reste — une infolettre pose volontiers
 * un `body{margin:0}` ou un `*{font-family:…}`.
 *
 * **Le fond reste blanc, même en thème sombre.** Un e-mail est mis en page pour
 * du blanc : l'afficher sur du noir donne des logos en négatif, du texte foncé
 * sur foncé et des images à halo. Mieux vaut une carte claire assumée qu'un
 * message à moitié lisible.
 *
 * Le seul script du cadre est le nôtre, en deux lignes : dire sa hauteur, et
 * révéler les images à la demande. Sans lui, il faudrait deviner la hauteur.
 */
export function MessageBody({ message, className }: { message: Message; className?: string }) {
  if (!message.html) {
    /* Ni corps ni HTML : il arrive. Une liste vient de dire ce que le message
       raconte (`snippet`), l'ouvrir ne doit pas montrer moins que la liste —
       on garde donc cette ligne, en gris, et le reste en attente dessous. Un
       message vraiment sans texte le dit lui-même, il ne passe pas par ici. */
    if (!message.body) return <Attente />;
    return <p className={className}>{message.body}</p>;
  }
  return <CorpsHtml html={message.html} bloquees={message.blockedImages ?? 0} />;
}

/**
 * Les lignes du message, avant le message. Sans animation, comme la liste.
 *
 * Sans la classe de l'appelant : elle porte `block`, qui l'emporterait sur le
 * `flex` d'ici — les barres deviendraient des `span` en ligne, donc sans
 * hauteur, donc invisibles. Mesuré, une fois le squelette resté introuvable.
 */
function Attente() {
  return (
    <span aria-hidden className="mt-4 flex flex-col gap-2.5">
      {[92, 100, 96, 64].map((w, i) => (
        <span key={i} className="h-3 rounded-full bg-foreground/[0.07]" style={{ width: `${w}%` }} />
      ))}
    </span>
  );
}

const MARGE = 12;

const STYLE = `
  :root { color-scheme: light; }
  html, body { margin: 0; background: #fff; color: #111; }
  body {
    font: 15px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    overflow-wrap: anywhere;
    /* L'horizontale appartient au geste de retour, pas au cadre. Le panorama
       vertical continue de remonter au défilant de la page ; ce qu'on perd est
       de pouvoir tirer latéralement un courrier plus large que l'écran, et
       c'est rare — overflow-wrap, img et table sont déjà bornés.
       (Pas d'accent grave dans ce commentaire : il vit dans un littéral
       gabarit, et le premier le terminerait.) */
    touch-action: pan-y;
  }
  img { max-width: 100%; height: auto; }
  img[data-src] { display: none; }
  a { color: #0b57d0; }
`;

/**
 * Les garde-fous, **posés après le message**.
 *
 * `html.ts` garde le `<style>` d'une infolettre — sans lui la mise en page
 * s'effondre en colonne unique. Mais ce style vit *dans* le corps, donc après le
 * nôtre : une infolettre qui pose `body { margin: 0; padding: 0 }` — et elles le
 * font toutes — reprenait la marge qu'on venait de donner, et le courrier
 * repartait coller aux deux bords. Ces règles-là sont donc écrites en dernier et
 * en `!important` : à importance égale, c'est l'ordre qui tranche, et on est
 * après.
 *
 * La marge vit sur `html`, pas sur `body` : aucune infolettre ne cible `html`,
 * et le fond du corps se propage quand même au canevas — un courrier à fond
 * coloré le garde jusqu'aux bords.
 */
const GARDE = `
  html {
    box-sizing: border-box !important;
    padding: ${MARGE}px !important;
    /* Le cadre ne defile jamais : il est dimensionne sur son contenu et c'est
       la page qui defile. Sans cela, le contenu mis a l'echelle laisserait
       derriere lui la hauteur de sa mise en page, non reduite, en zone vide
       defilante. */
    overflow: hidden !important;
  }
  body {
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
  }
  /* L'enveloppe que l'on met a l'echelle. En flow-root pour que les marges des
     enfants ne s'echappent pas : c'est sa boite qui donne la hauteur.
     (Pas d'accent grave ici : ce bloc vit dans un litteral gabarit.) */
  #arc-fit { transform-origin: 0 0 !important; display: flow-root !important; }
`;

/* Quatre tâches, et rien d'autre : **mettre le courrier à la largeur**,
   rapporter la hauteur (le cadre ne sait pas se dimensionner), rendre les
   images quand on les demande, et **relayer les touchers** — un cadre les garde
   pour lui, et le geste de retour n'existait donc pas sur un message HTML. */
const SCRIPT = `
  (function () {
    var MARGE = ${MARGE};
    var fit = document.getElementById("arc-fit");
    var occupe = false;

    /* **Un courrier a sa largeur, l'ecran a la sienne.** Une infolettre pose un
       tableau de 600 px ; sur un telephone de 393 il debordait, et comme
       l'horizontale appartient au geste de retour on ne pouvait meme pas aller
       voir ce qui manquait — la moitie du message etait perdue. On le reduit
       donc pour qu'il tienne, comme le fait Mail d'iOS. **Pas de plancher** :
       un courrier rogne est le defaut qu'on corrige, et un courrier petit reste
       un courrier entier. En pratique les infolettres font 600 a 800 px, le
       texte long se replie deja (overflow-wrap) et les images sont bornees.
       La transformation est visuelle : la boite de mise en page garde sa
       hauteur entiere, donc c'est le rectangle **transforme** qu'on mesure. */
    var dire = function () {
      if (occupe) return;
      occupe = true;
      fit.style.width = "";
      fit.style.transform = "";
      /* La largeur disponible se lit sur l'enveloppe elle-meme : un bloc remplit
         la boite de contenu de son parent, ou que vive la marge — la notre sur
         html, celle que l'infolettre se donne sur body. Mesurer la fenetre
         obligeait a deviner ou etaient passes les pixels. */
      var dispo = fit.offsetWidth;
      var naturel = Math.max(fit.scrollWidth, dispo);
      var echelle = naturel > dispo + 1 ? dispo / naturel : 1;
      var h;
      if (echelle < 1) {
        fit.style.width = naturel + "px";
        fit.style.transform = "scale(" + echelle + ")";
        h = Math.ceil(fit.getBoundingClientRect().height) + MARGE * 2;
      } else {
        h = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      }
      occupe = false;
      parent.postMessage({ type: "arc-mail-height", height: h }, "*");
    };

    addEventListener("load", dire);
    addEventListener("resize", dire);
    addEventListener("message", function (e) {
      if (!e.data) return;
      /* La page peut aussi redemander la hauteur quand elle est prete. */
      if (e.data.type === "arc-mail-ping") return dire();
      if (e.data.type !== "arc-mail-images") return;
      var liste = document.querySelectorAll("img[data-src]");
      for (var i = 0; i < liste.length; i++) {
        liste[i].setAttribute("src", liste[i].getAttribute("data-src"));
        liste[i].removeAttribute("data-src");
      }
      dire();
    });
    /* Les coordonnees sont celles du cadre ; la page y ajoute sa position.
       On observe seulement : pas de preventDefault ici, touch-action a deja
       retire l'horizontale au cadre. */
    var relais = function (phase) {
      return function (e) {
        var t = e.changedTouches[0];
        if (!t || e.touches.length > 1) return;
        parent.postMessage(
          { type: "arc-mail-touch", phase: phase, x: t.clientX, y: t.clientY },
          "*"
        );
      };
    };
    addEventListener("touchstart", relais("start"), { passive: true });
    addEventListener("touchmove", relais("move"), { passive: true });
    addEventListener("touchend", relais("end"), { passive: true });
    addEventListener("touchcancel", relais("cancel"), { passive: true });
    /* On observe le **document**, pas l'enveloppe : la mesurer pendant qu'on la
       redimensionne ferait boucler l'observateur sur son propre effet. */
    if (window.ResizeObserver) new ResizeObserver(dire).observe(document.documentElement);
    /* Le cadre est pret avant que la page ne l'ecoute : un effet React
       n'attache son ecouteur qu'apres la peinture, et le premier envoi tombait
       dans le vide — le message gardait sa hauteur par defaut (mesure : 220 px
       affiches pour 481 de contenu). On redit, deux fois, plutot que de
       supposer qui arrive en premier. */
    dire();
    setTimeout(dire, 120);
    setTimeout(dire, 600);
  })();
`;

function CorpsHtml({ html, bloquees }: { html: string; bloquees: number }) {
  const cadre = useRef<HTMLIFrameElement>(null);
  const [hauteur, setHauteur] = useState(220);
  const [montrees, setMontrees] = useState(false);
  const relais = useRelaisRetour();
  /* L'écouteur est posé une fois ; il lit le relais courant sans se refaire. */
  const versLeRetour = useRef(relais);
  useEffect(() => {
    versLeRetour.current = relais;
  });

  const srcDoc = useMemo(
    () =>
      `<!doctype html><html><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<style>${STYLE}</style></head><body><div id="arc-fit">${html}</div>` +
      /* Après le message, pas avant : le `<style>` d'une infolettre est dans le
         corps, et à importance égale c'est l'ordre qui tranche. */
      `<style>${GARDE}</style><script>${SCRIPT}<\/script></body></html>`,
    [html],
  );

  useEffect(() => {
    const ecoute = (e: MessageEvent) => {
      /* Le cadre est d'origine opaque : `origin` vaut « null » et ne prouve
         rien. C'est la fenêtre qui identifie l'émetteur. */
      if (e.source !== cadre.current?.contentWindow) return;
      const data = e.data as {
        type?: string;
        height?: number;
        phase?: TouchRelaye["phase"];
        x?: number;
        y?: number;
      };
      if (data?.type === "arc-mail-height" && typeof data.height === "number") {
        setHauteur(Math.min(Math.max(Math.ceil(data.height), 80), 20000));
        return;
      }
      /* Le cadre fait toute la hauteur de son contenu : il ne défile jamais
         chez lui, et sa position à l'écran suffit à replacer le toucher. */
      if (data?.type === "arc-mail-touch" && data.phase && cadre.current) {
        const boite = cadre.current.getBoundingClientRect();
        versLeRetour.current?.({
          phase: data.phase,
          x: boite.left + (data.x ?? 0),
          y: boite.top + (data.y ?? 0),
          time: performance.now(),
        });
      }
    };
    window.addEventListener("message", ecoute);
    return () => window.removeEventListener("message", ecoute);
  }, []);

  const montrer = () => {
    cadre.current?.contentWindow?.postMessage({ type: "arc-mail-images" }, "*");
    setMontrees(true);
  };

  return (
    <div className="mt-4 overflow-hidden rounded-xl bg-white ring-1 ring-black/[0.08]">
      {bloquees > 0 && !montrees && (
        /* Dire ce qui est retenu, et pourquoi, plutôt que d'afficher un
           message troué sans explication. */
        <div className="flex items-center gap-2 border-b border-black/[0.06] bg-[#f6f6f7] px-3 py-2 text-[13px] text-[#444]">
          <ImageOff className="size-4 shrink-0" />
          <span className="min-w-0 flex-1">
            {bloquees} image{bloquees > 1 ? "s" : ""} distante{bloquees > 1 ? "s" : ""} retenue
            {bloquees > 1 ? "s" : ""} — les charger signale la lecture à l&apos;expéditeur.
          </span>
          <button
            type="button"
            onClick={montrer}
            className="shrink-0 rounded-full bg-white px-3 py-1 font-medium text-[#0b57d0] shadow-[0_0_0_1px_rgb(0_0_0/0.08)]"
          >
            Afficher
          </button>
        </div>
      )}
      <iframe
        ref={cadre}
        /* Le navigateur en fait une infobulle native au survol : « Message »
           tout court apparaissait comme une étiquette égarée sur l'en-tête. */
        title="Contenu du message"
        srcDoc={srcDoc}
        onLoad={() => cadre.current?.contentWindow?.postMessage({ type: "arc-mail-ping" }, "*")}
        /* Pas de `allow-same-origin` : c'est cette absence qui donne au cadre
           une origine à lui, sans accès à la page ni aux cookies. Les liens
           ont besoin des deux `popups` pour s'ouvrir hors du bac à sable. */
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        className="block w-full border-0"
        style={{ height: hauteur }}
      />
    </div>
  );
}
