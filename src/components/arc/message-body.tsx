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

const STYLE = `
  :root { color-scheme: light; }
  html, body { margin: 0; background: #fff; color: #111; }
  body {
    padding: 12px;
    font: 15px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    overflow-x: auto;
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
  table { max-width: 100%; }
  a { color: #0b57d0; }
`;

/* Trois tâches, et rien d'autre : rapporter la hauteur (le cadre ne sait pas se
   dimensionner), rendre les images quand on les demande, et **relayer les
   touchers** — un cadre les garde pour lui, et le geste de retour n'existait
   donc pas sur un message HTML. */
const SCRIPT = `
  (function () {
    var dire = function () {
      var h = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      parent.postMessage({ type: "arc-mail-height", height: h }, "*");
    };
    addEventListener("load", dire);
    addEventListener("resize", dire);
    addEventListener("message", function (e) {
      if (!e.data) return;
      /* La page peut aussi redemander la hauteur quand elle est prête. */
      if (e.data.type === "arc-mail-ping") return dire();
      if (e.data.type !== "arc-mail-images") return;
      var liste = document.querySelectorAll("img[data-src]");
      for (var i = 0; i < liste.length; i++) {
        liste[i].setAttribute("src", liste[i].getAttribute("data-src"));
        liste[i].removeAttribute("data-src");
      }
      dire();
    });
    /* Les coordonnées sont celles du cadre ; la page y ajoute sa position.
       On observe seulement : pas de preventDefault ici, touch-action a déjà
       retiré l'horizontale au cadre. */
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
    if (window.ResizeObserver) new ResizeObserver(dire).observe(document.documentElement);
    /* Le cadre est prêt avant que la page ne l'écoute : un effet React
       n'attache son écouteur qu'après la peinture, et le premier envoi tombait
       dans le vide — le message gardait sa hauteur par défaut (mesuré : 220 px
       affichés pour 481 de contenu). On redit, deux fois, plutôt que de
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
      `<style>${STYLE}</style></head><body>${html}<script>${SCRIPT}<\/script></body></html>`,
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
        title="Message"
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
