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
export function MessageBody({
  message,
  sujet,
  className,
}: {
  message: Message;
  /** L'objet du fil : sert à masquer le préheader qui le répète (voir `SCRIPT`). */
  sujet?: string;
  className?: string;
}) {
  if (!message.html) {
    /* Ni corps ni HTML : il arrive. Une liste vient de dire ce que le message
       raconte (`snippet`), l'ouvrir ne doit pas montrer moins que la liste —
       on garde donc cette ligne, en gris, et le reste en attente dessous. Un
       message vraiment sans texte le dit lui-même, il ne passe pas par ici. */
    if (!message.body) return <Attente />;
    return <p className={className}>{message.body}</p>;
  }
  return <CorpsHtml html={message.html} bloquees={message.blockedImages ?? 0} sujet={sujet ?? ""} />;
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

/**
 * La marge du cadre, sur les quatre cotes.
 *
 * **16 px, et non 12.** C'est ce qui manquait a la lecture : le courrier
 * commençait a douze pixels du bord quand tout le reste de l'ecran — objet,
 * expediteur, texte simple — se tient a vingt. Quatre pixels de plus le
 * rapprochent de cette verticale sans lui coûter d'echelle qui se voie (une
 * infolettre de 600 px passe de 0,615 a 0,602 sur un telephone de 393).
 */
const MARGE = 16;

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
  /* **Une image sans source ne montre qu'un cadre vide et son texte de
     secours.** C'est ce que devient une image jointe dont le cid: est
     introuvable, ou une adresse au schéma refusé par le laveur : un rectangle
     bordé avec « GoDaddy » écrit dedans, au milieu du courrier.
     (Pas d'accent grave ici : ce bloc vit dans un littéral gabarit.) */
  img:not([src]), img[src=""] { display: none; }
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
    var SUJET = __SUJET__;
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
    /* La marge du cadre, posee en ligne et en !important : elle bat la feuille
       de garde, qui l'est aussi. */
    var marge = MARGE;
    var poser = function (px) {
      marge = px;
      document.documentElement.style.setProperty("padding", px + "px", "important");
    };

    var dire = function () {
      if (occupe) return;
      occupe = true;
      fit.style.width = "";
      fit.style.transform = "";
      poser(MARGE);
      /* La largeur disponible se lit sur l'enveloppe elle-meme : un bloc remplit
         la boite de contenu de son parent, ou que vive la marge — la notre sur
         html, celle que l'infolettre se donne sur body. Mesurer la fenetre
         obligeait a deviner ou etaient passes les pixels. */
      var dispo = fit.offsetWidth;
      var naturel = Math.max(fit.scrollWidth, dispo);
      /* **Un courrier qui apporte sa mise en page ne paie pas notre marge.**
         Deux facons de l'apporter, et il fallait les deux :

         - il est **plus large que l'ecran** — un tableau de 600 px sur un
           telephone de 393 est deja reduit, et les 32 px de cadre lui
           retiraient encore 8 % de taille de texte ;
         - il **peint son propre fond** — une infolettre pose un
           body{background:#f4f4f4} qui arrive apres le notre, et notre marge
           blanche devient alors un lisere visible tout autour du gris. C'est le
           cas signale sur un courrier GoDaddy : il est responsive, donc jamais
           reduit, donc la premiere regle ne le voyait pas.

         Elle reste pour un courrier sur fond blanc qui tient dans la largeur :
         la, du texte viendrait sinon coller au bord. */
      var fond = getComputedStyle(document.body).backgroundColor;
      var neutre = !fond || fond === "rgba(0, 0, 0, 0)" || fond === "transparent" || fond === "rgb(255, 255, 255)";
      if (naturel > dispo + 1 || !neutre) {
        poser(0);
        dispo = fit.offsetWidth;
        naturel = Math.max(fit.scrollWidth, dispo);
      }
      var echelle = naturel > dispo + 1 ? dispo / naturel : 1;
      var h;
      if (echelle < 1) {
        fit.style.width = naturel + "px";
        fit.style.transform = "scale(" + echelle + ")";
        h = Math.ceil(fit.getBoundingClientRect().height) + marge * 2;
      } else {
        h = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      }
      occupe = false;
      parent.postMessage({ type: "arc-mail-height", height: h }, "*");
    };

    /* **L'objet, ecrit deux fois.** Une infolettre commence par un « preheader »
       — la ligne que les listes de mail montrent en apercu — et il repete
       presque toujours l'objet. Cache par l'expediteur quand il pense a le
       faire, visible sinon : on se retrouvait avec le titre en 26 px puis le
       meme texte en petit, deux centimetres plus bas. On masque donc le premier
       bloc du message quand il ne dit rien de plus que l'objet.
       Rien n'est retire du message : on le masque, et le texte reste dans la
       source. (Pas d'accent grave ici : ce bloc vit dans un litteral gabarit.) */
    var masquerRedite = function () {
      if (!SUJET) return;
      /* Les preheaders se rembourrent de caracteres invisibles pour occuper la
         ligne d'apercu — le classique est &#847;&zwnj;&nbsp; repete. Sans les
         retirer, le texte ne valait jamais l'objet et rien n'etait masque. */
      var lave = function (t) {
        return (t || "")
          .replace(/[\\u00ad\\u034f\\u200b-\\u200f\\u2028\\u2029\\u2060\\ufeff]/g, "")
          .replace(/\\s+/g, " ")
          .trim()
          .toLowerCase();
      };
      var cible = lave(SUJET);
      if (!cible) return;
      /* Il dit l'objet **et rien d'autre** : du remplissage ou de la
         ponctuation peuvent trainer derriere, jamais un mot de plus. */
      var redite = function (texte) {
        if (texte.indexOf(cible) !== 0) return false;
        return !/[\\p{L}\\p{N}]/u.test(texte.slice(cible.length));
      };
      /* **Le filtre compte autant que la marche.** Le premier texte du
         document est celui du <style> que garde le laveur — du CSS, non vide —
         et sans lui la recherche s'arretait la. On saute aussi ce qui est deja
         invisible : un preheader que l'expediteur a pense a cacher ne doit pas
         faire renoncer a celui qui suit. */
      var marcheur = document.createTreeWalker(fit, NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          var p = n.parentElement;
          while (p && p !== fit) {
            if (p.tagName === "STYLE" || p.tagName === "SCRIPT") return NodeFilter.FILTER_REJECT;
            var st = getComputedStyle(p);
            if (st.display === "none" || st.visibility === "hidden") return NodeFilter.FILTER_REJECT;
            p = p.parentElement;
          }
          return lave(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        },
      });
      var premier = marcheur.nextNode();
      if (!premier || !redite(lave(premier.nodeValue))) return;

      /* **On remonte tant que le bloc ne dit que ca.** Le preheader vit tantot
         dans une boite a lui — et c'est elle qu'il faut retirer, avec ses
         marges —, tantot en texte nu au milieu de l'enveloppe du message, dont
         le parent porte tout le reste : c'est ce cas-la qui echouait, la
         version d'avant partant du parent et ne trouvant jamais de bloc dont le
         texte entier soit l'objet. On part donc du **noeud de texte**, et on ne
         monte que tant que le contenant n'ajoute rien. */
      var cible2 = premier;
      var haut = premier.parentElement;
      while (haut && haut !== fit && redite(lave(haut.textContent))) {
        cible2 = haut;
        haut = haut.parentElement;
      }

      if (cible2.nodeType === 3) {
        /* Texte nu : on l'enveloppe pour pouvoir le masquer. Le message n'est
           pas modifie au sens ou rien n'est retire — le texte reste dans la
           source, il cesse seulement d'etre peint. */
        var etui = document.createElement("span");
        etui.style.display = "none";
        cible2.parentNode.insertBefore(etui, cible2);
        etui.appendChild(cible2);
        return;
      }
      /* **On masque le petit, pas le grand.** Une infolettre peut ouvrir sur
         son propre titre, dessine et colore, qui repete lui aussi l'objet : le
         retirer laisserait un trou dans sa mise en page. Le preheader, lui, est
         du texte nu — pas d'image, et la taille du corps. */
      var taille = parseFloat(getComputedStyle(cible2).fontSize) || 0;
      if (taille < 20 && !cible2.querySelector("img")) cible2.style.display = "none";
    };
    masquerRedite();

    addEventListener("load", masquerRedite);
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

function CorpsHtml({ html, bloquees, sujet }: { html: string; bloquees: number; sujet: string }) {
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
      /* Le sujet entre dans le script comme une **donnée**, pas comme du code :
         `JSON.stringify` échappe les guillemets, et la séquence `</` est
         coupée pour qu'un objet contenant `</script>` ne referme pas la
         balise. */
      `<style>${GARDE}</style><script>${SCRIPT.replace(
        "__SUJET__",
        JSON.stringify(sujet).replace(/<\//g, "<\\/"),
      )}<\/script></body></html>`,
    [html, sujet],
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
    /* **Un seul cadre sur telephone.** La feuille blanche du courrier y est la
       surface : elle remplit la carte, sans marge ni anneau — un rectangle
       arrondi de plus a l'interieur d'un autre etait le troisieme cadre que la
       fiche interdit. Sur bureau elle garde son anneau et son rayon : elle y
       flotte sur le fond sombre du volet, et sans bord elle n'aurait plus de
       tranche. */
    <div className="overflow-hidden bg-white md:mt-4 md:rounded-xl md:ring-1 md:ring-black/[0.08]">
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
