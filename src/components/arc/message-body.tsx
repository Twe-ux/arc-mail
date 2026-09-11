"use client";

import { ImageOff, MoreHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { TouchRelaye } from "@/hooks/use-edge-swipe-back";
import { couperCitation, type Enveloppe } from "@/lib/fil";
import type { Message } from "@/lib/types";
import { cn } from "@/lib/utils";
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
  forme,
  dark,
}: {
  message: Message;
  /** L'objet du fil : sert à masquer le préheader qui le répète (voir `script`). */
  sujet?: string;
  className?: string;
  /**
   * Sous quelle forme le message est posé (`enveloppe`), et **elle est
   * obligatoire**.
   *
   * `bulle` : le cadre devient **transparent** et prend l'encre de l'app — la
   * bulle est la surface. `feuille` : il est dans une bulle lui aussi, mais
   * garde son **fond blanc et son encre d'origine**, parce que ses couleurs ont
   * été écrites pour du blanc. `document` : la feuille pleine largeur, posée
   * sur le canevas des courriers.
   *
   * Elle était facultative, et l'absence valait « feuille pleine largeur » : un
   * `feuille` et un `document` arrivaient donc ici sous le même visage, et le
   * cadre re-décidait lui-même lequel des deux il tenait — sur un seul
   * `<table>`, quand `enveloppe` en demande trois. Une signature dans un
   * tableau suffisait à poser un mot de deux lignes sur 600 px et à le réduire
   * à **`scale(0,512)`** — mesuré sur téléphone : 15 px de texte affichés à 7,7,
   * entre deux voisins à 15. Le même message, écrit par deux clients
   * différents, n'avait pas la même taille de texte. **Le cadre reçoit la
   * forme, il n'en juge plus.**
   */
  forme: Enveloppe;
  /** Le thème courant : un cadre est un autre document, nos variables n'y vont pas. */
  dark?: boolean;
}) {
  if (!message.html) {
    /* Ni corps ni HTML : il arrive. Une liste vient de dire ce que le message
       raconte (`snippet`), l'ouvrir ne doit pas montrer moins que la liste —
       on garde donc cette ligne, en gris, et le reste en attente dessous. Un
       message vraiment sans texte le dit lui-même, il ne passe pas par ici. */
    if (!message.body) return <Attente />;
    return <CorpsTexte texte={message.body} className={className} />;
  }
  return (
    <CorpsHtml
      html={message.html}
      bloquees={message.blockedImages ?? 0}
      sujet={sujet ?? ""}
      forme={forme}
      dark={dark}
    />
  );
}

/**
 * Un message en texte simple, **sa citation repliée**.
 *
 * Répondre recopie le message d'en face en dessous du sien : un fil de quatre
 * échanges porte donc quatre fois le premier message, et on ne sait plus qui a
 * répondu à quoi. Tous les clients replient cette part derrière trois points ;
 * on n'en avait aucun.
 *
 * Le bouton **reste** une fois déplié : ce qu'on a ouvert doit pouvoir se
 * refermer, et c'est aussi ce qui dit que le repli était le nôtre, pas une
 * troncature du message.
 */
function CorpsTexte({ texte, className }: { texte: string; className?: string }) {
  const { visible, citation } = useMemo(() => couperCitation(texte), [texte]);
  const [ouverte, setOuverte] = useState(false);
  if (!citation) return <p className={className}>{texte}</p>;
  return (
    <div className={className}>
      {visible}
      {"\n"}
      <button
        type="button"
        onClick={() => setOuverte((v) => !v)}
        aria-expanded={ouverte}
        aria-label={ouverte ? "Masquer le message cité" : "Afficher le message cité"}
        className="my-2 inline-flex h-[22px] items-center rounded-full bg-foreground/[0.08] px-2.5 align-middle text-[13px] leading-none font-semibold text-muted-foreground transition-colors hover:bg-foreground/[0.13] active:bg-foreground/[0.16]"
      >
        <MoreHorizontal className="size-4" strokeWidth={2.25} />
      </button>
      {ouverte && (
        <span className="block border-l-2 border-foreground/15 pl-3 text-muted-foreground">{citation}</span>
      )}
    </div>
  );
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

/**
 * La feuille du cadre.
 *
 * **Hors carte, elle n'est plus une feuille** : fond transparent, encre de
 * l'app — c'est le cas d'une bulle, et celui d'une feuille en thème clair, où
 * la surface de l'app est déjà blanche. Un cadre est un autre document — nos
 * variables CSS n'y entrent pas —,
 * donc le thème lui est dit, il ne se devine pas : `prefers-color-scheme`
 * répondrait celui du système, et le nôtre est un réglage de l'app.
 */
const feuille = (carte: boolean, dark: boolean, forme: Enveloppe) => {
  const transparent = !carte;
  /* **Le même interligne que l'app**, pour tout ce qui est une conversation.
     Le cadre écrivait 1,55 quand le fil écrit 1,65 : deux messages voisins,
     l'un en texte simple (rendu par la page) et l'autre en HTML (rendu par le
     cadre), n'avaient pas la même respiration — 1,5 px par ligne, assez pour
     qu'on voie que « ça change d'un mail à l'autre » sans savoir dire quoi.
     Un document garde le sien : il apporte sa propre mise en page, et la
     nôtre n'a rien à y dire. */
  const inter = forme === "document" ? 1.55 : 1.65;
  return `
  :root { color-scheme: ${transparent && dark ? "dark" : "light"}; }
  /* **iOS gonfle le texte d'un document qui ne le lui interdit pas.** Son
     « text autosizing » agrandit les blocs qu'il juge trop etroits, d'un
     facteur qui depend de la structure du courrier — donc different d'un mail
     a l'autre. La page, elle, ne l'a jamais subi : Tailwind pose cette ligne
     dans son preflight. Le cadre est un autre document, ecrit a la main : il
     n'avait pas de preflight, donc pas cette ligne. Mesure sur la vraie boite :
     93 px d'appareil par ligne la ou le cadre declare 15/1,55, soit 69,75 —
     un facteur **1,33**, quand notre interface de la meme capture est juste.
     Invisible en emulation : Chromium ne fait pas d'autosizing. */
  html {
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }
  html, body {
    margin: 0;
    background: ${transparent ? "transparent" : "#fff"};
    color: ${transparent && dark ? "#ededef" : "#111"};
  }
  body {
    font: 15px/${inter} -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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
  a { color: ${transparent && dark ? "#7fabf5" : "#0b57d0"}; }
  /* Le bouton de la citation, dessiné dans le cadre : c'est là que vit la
     citation, et une réplique dans la page ne saurait pas où se poser. */
  .arc-cit {
    display: inline-flex; align-items: center; justify-content: center;
    height: 22px; padding: 0 9px; margin: 6px 0;
    border: 0; border-radius: 999px; cursor: pointer;
    background: ${transparent && dark ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.07)"};
    color: ${transparent && dark ? "#b9b9be" : "#5c5c66"};
    font: 700 15px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    letter-spacing: 1px;
  }
  .arc-cit:hover { background: ${transparent && dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)"}; }
`;
};

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
const garde = (marge: number) => `
  html {
    box-sizing: border-box !important;
    /* Reecrit apres le message et en !important : le <style> d'une infolettre
       arrive apres le notre, et un text-size-adjust: auto de sa part rendrait le
       courrier a iOS. Voir la feuille de base pour la mesure.
       (Pas d'accent grave ici : ce bloc vit dans un litteral gabarit.) */
    -webkit-text-size-adjust: 100% !important;
    text-size-adjust: 100% !important;
    padding: ${marge}px !important;
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
const script = (marge: number, canevas: number, doc: boolean) => `
  (function () {
    var MARGE = ${marge};
    /* La page pour laquelle les courriers sont ecrits, depuis toujours.
       **Zero hors document** : le canevas sert a rendre une infolettre a la
       taille pour laquelle elle est ecrite, puis a la reduire. Un message de
       conversation fait 230 a 330 px sur un telephone — poser une signature sur
       600 et reduire a 0,38 donnait un message a la loupe (mesure : la
       signature de Sophie illisible dans sa bulle). Ce qui n'est pas un
       document n'a pas de mise en page a preserver, par definition (voir
       enveloppe). */
    var CANEVAS = ${canevas};
    /* **Seul un document peut perdre sa marge et passer sur le canevas.** La
       forme est decidee avant la peinture, sur la chaine ; ce qui suit ne fait
       que la preciser. */
    var DOC = ${doc ? "true" : "false"};
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
         Elle lui coute de la largeur — 8 % de taille de texte sur un tableau de
         600 px reduit a un telephone de 393 — et elle se voit comme un lisere
         blanc tout autour de son fond. Trois facons de reconnaitre qu'il en
         apporte une, et il fallait les trois :

         - il est **plus large que l'ecran**, donc deja reduit ;
         - il **peint son propre fond** sur body ;
         - il **est bati sur des tableaux**, ce que fait toute infolettre : elle
           porte alors ses propres marges, et les notres s'ajoutent aux siennes.
           C'est ce cas-la qui restait — le courrier GoDaddy est responsive
           (jamais reduit) et pose son gris sur une table, pas sur body, donc
           les deux premieres regles ne le voyaient pas.

         Reste avec sa marge le courrier en HTML simple, quelques paragraphes
         sans mise en page : la, du texte viendrait coller au bord.

         **Le troisieme indice a change.** C'etait « il y a un <table> quelque
         part » ; or toute signature professionnelle en porte un, et un simple
         mot d'une personne perdait donc sa marge. On regarde maintenant si le
         courrier **peint son fond pres de la racine** — body, ou l'un des trois
         premiers contenants de la chaine des premiers enfants. Une infolettre
         pose son gris la (le courrier GoDaddy le met sur sa table exterieure,
         pas sur body) ; une signature, jamais : elle vient apres les
         paragraphes, donc jamais sur cette chaine. */
      var neutreFond = function (c) {
        return !c || c === "rgba(0, 0, 0, 0)" || c === "transparent" || c === "rgb(255, 255, 255)";
      };
      var peint = !neutreFond(getComputedStyle(document.body).backgroundColor);
      var noeud = fit.firstElementChild;
      for (var p = 0; !peint && noeud && p < 3; p++) {
        peint = !neutreFond(getComputedStyle(noeud).backgroundColor);
        noeud = noeud.firstElementChild;
      }
      var misEnPage = DOC && (naturel > dispo + 1 || peint);
      if (misEnPage) {
        poser(0);
        dispo = fit.offsetWidth;
        naturel = Math.max(fit.scrollWidth, dispo);
      }
      /* **Le canevas des courriers, puis la reduction** — ce que fait Mail
         d'iOS. Un courrier mis en page est ecrit pour une page de 600 px ;
         rendu sur les 393 d'un telephone, ses regles pour petit ecran prennent
         la main et il s'affiche en gros caracteres, bien plus gros que le meme
         courrier chez Apple, qui le pose sur 600 et le reduit. Deux courriers
         voisins n'avaient alors pas la meme taille de texte, et aucun n'avait
         celle de l'app. On le pose donc sur le canevas quand l'ecran est plus
         etroit, et l'echelle fait le reste.
         **Seulement s'il deborde vraiment.** Un courrier qui tient dans
         l'ecran n'a aucune mise en page a preserver : le poser sur 600 puis le
         reduire ne fait que rapetisser son texte. Mesure sur la vraie boite,
         deux courriers d'affaires voisins : 58 px d'appareil par ligne d'un
         cote, 95 de l'autre — un rapport de 0,61, qui est 393/600. Le premier
         n'avait pour toute mise en page qu'une signature a logo, large de
         340 px : il tenait, et il s'affichait quand meme a 10 px quand son
         voisin s'affichait a 16. Prix assume : une infolettre *responsive*, qui
         tient elle aussi, garde desormais sa typographie de petit ecran — celle
         que son auteur a ecrite, et celle que les autres clients montrent.
         Le HTML simple n'y passe pas non plus : 15 px reduits a 0,65 ne se
         lisent plus, et un texte sans mise en page n'a pas de largeur a lui. */
      if (CANEVAS && naturel > dispo + 1 && dispo < CANEVAS) {
        fit.style.width = CANEVAS + "px";
        naturel = Math.max(fit.scrollWidth, CANEVAS);
      }
      /* **La largeur que le message demanderait s'il avait la place.** Un cadre
         vaut 300 px par defaut, et une bulle qui epouse son cadre se verrouille
         donc a 300 quoi qu'elle porte : une phrase de dix mots s'y repliait sur
         trois lignes a cote d'une bulle de texte qui en prenait une. On mesure
         en max-content, on rend la mesure a la page, et c'est elle qui borne la
         bulle — bornee a son tour par les 76 % de la colonne. */
      var avant = fit.style.width;
      fit.style.width = "max-content";
      var voulue = Math.ceil(fit.getBoundingClientRect().width) + marge * 2;
      fit.style.width = avant;

      var echelle = naturel > dispo + 1 ? dispo / naturel : 1;
      if (echelle < 1) {
        fit.style.width = naturel + "px";
        fit.style.transform = "scale(" + echelle + ")";
      }
      /* **On mesure l'enveloppe, jamais le document.** Le scrollHeight de
         documentElement ne descend pas sous la hauteur de la fenetre du cadre :
         un message plus court que le cadre courant rendait donc la hauteur du
         cadre, et le cadre ne retrecissait plus jamais. Invisible tant qu'un
         courrier etait long ; replier une citation le rend court d'un coup, et
         la bulle gardait 220 px pour deux lignes (mesure : docSH 220,
         bodySH 81, enveloppe 80,5).
         L'enveloppe est en flow-root : sa boite *est* le contenu, marges des
         enfants comprises. Le scrollHeight de body reste en garde-fou — lui
         n'a pas de plancher — pour ce qui echapperait au flux.
         (Pas d'accent grave ici : ce bloc vit dans un litteral gabarit.) */
      var h = Math.ceil(fit.getBoundingClientRect().height) + marge * 2;
      /* Le garde-fou ne vaut **qu'a l'echelle 1** : le rectangle de l'enveloppe
         est transforme, le scrollHeight de body ne l'est pas. Les prendre au
         maximum rendait la hauteur de mise en page d'une infolettre de 600 px
         posee sur un telephone de 393 — 128 px de gris sous le message. */
      if (echelle === 1) h = Math.max(h, document.body.scrollHeight);
      occupe = false;
      parent.postMessage({ type: "arc-mail-height", height: h, width: voulue }, "*");
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

    /* **La citation, repliee.**

       Repondre a un mail en recopie l'integralite dessous : un fil de quatre
       echanges porte quatre fois le premier message, et on ne sait plus qui a
       repondu a quoi. Tous les clients replient cette part ; on n'en avait
       aucun. Elle n'est jamais retiree — le bouton la rend, et il reste pour
       pouvoir la refermer.

       Le repli se fait **ici**, dans le cadre : la citation y vit, et un
       bouton pose dans la page n'aurait pas su ou se placer. La hauteur est
       redite a chaque bascule, sans quoi le cadre garderait celle du message
       replie. (Pas d'accent dans ce bloc : il vit dans un litteral gabarit.) */
    var SELECTEURS = [
      ".gmail_quote",
      "blockquote[type=cite]",
      ".moz-cite-prefix",
      ".yahoo_quoted",
      "#divRplyFwdMsg",
      ".protonmail_quote",
      "#appendonsend",
    ].join(",");
    /* « Le dim. 6 sept. 2026 a 22:10, X a ecrit : » — on ancre sur la fin,
       seule part que les clients ecrivent tous pareil. */
    var ATTRIBUTION = /(?:a \u00e9crit|wrote|schrieb|escribi\u00f3|ha scritto)\s*:\s*$/i;

    /* Y a-t-il du texte **avant** ce noeud chez son parent ? C'est la question
       qui dit jusqu'ou remonter : on monte tant que le contenant n'ajoute rien
       devant, et on s'arrete des qu'il y a un message au-dessus. Rien nulle
       part : le message *est* une citation, on ne replie pas. */
    var avant = function (n) {
      var s = n.previousSibling, t = "";
      while (s) { t += s.textContent || ""; s = s.previousSibling; }
      return t.replace(/[\s\u00a0]/g, "").length > 0;
    };

    var trouverCitation = function () {
      var q = fit.querySelector(SELECTEURS);
      if (!q) {
        /* Aucune classe connue : l'attribution est alors du texte nu, dans un
           bloc a elle (Mail d'iOS) ou au milieu du message. */
        var blocs = fit.querySelectorAll("div,p,span");
        for (var i = 0; i < blocs.length; i++) {
          var t = (blocs[i].textContent || "").trim();
          if (t.length > 0 && t.length <= 200 && ATTRIBUTION.test(t)) { q = blocs[i]; break; }
        }
      }
      if (!q) return null;
      var n = q;
      while (n.parentElement && n.parentElement !== fit && !avant(n)) n = n.parentElement;
      return avant(n) ? n : null;
    };

    var replierCitation = function () {
      var debut = trouverCitation();
      if (!debut || !debut.parentNode) return;
      var caches = [];
      var n = debut;
      while (n) { caches.push(n); n = n.nextElementSibling; }
      var ouverte = false;
      var poserEtat = function () {
        for (var i = 0; i < caches.length; i++) caches[i].style.display = ouverte ? "" : "none";
        bouton.setAttribute("aria-expanded", ouverte ? "true" : "false");
        bouton.setAttribute("aria-label", ouverte ? "Masquer le message cite" : "Afficher le message cite");
        dire();
      };
      /* **Le blanc d'avant part avec la citation.** Un webmail pose un ou deux
         <br> entre la reponse et ce qu'elle cite ; replier la citation seule
         laissait ce vide au milieu de la bulle — mesure : cent pixels sous une
         ligne de texte. On remonte donc tant que le voisin ne dit rien. */
      var vide = debut.previousElementSibling;
      while (vide && !(vide.textContent || "").replace(/[\s\u00a0]/g, "")) {
        caches.push(vide);
        vide = vide.previousElementSibling;
      }
      var bouton = document.createElement("button");
      bouton.type = "button";
      bouton.className = "arc-cit";
      bouton.textContent = "\u00b7\u00b7\u00b7";
      bouton.addEventListener("click", function () { ouverte = !ouverte; poserEtat(); });
      debut.parentNode.insertBefore(bouton, debut);
      poserEtat();
    };
    replierCitation();

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

function CorpsHtml({
  html,
  bloquees,
  sujet,
  forme,
  dark,
}: {
  html: string;
  bloquees: number;
  sujet: string;
  forme: Enveloppe;
  dark?: boolean;
}) {
  /* **La feuille blanche n'existe qu'en sombre.** En clair, la surface de
     l'app *est* blanche (`--background: oklch(1 0 0)`) : le cadre y peignait du
     blanc sur du blanc, et tout ce qu'il ajoutait était un filet et seize
     pixels de retrait — un message décalé de ses voisins pour rien. Ce qui
     justifie la feuille, c'est le fond sombre : un noir de signature écrit pour
     du blanc n'y survit pas. Elle se lève donc là, et là seulement.
     Un document, lui, garde la sienne dans les deux thèmes : il apporte sa mise
     en page, et elle est écrite pour une page blanche. */
  const carte = forme === "document" || (forme === "feuille" && Boolean(dark));
  /* **La marge et le canevas suivent la forme**, et rien d'autre. Ils se
     lisaient sur la seule presence de `forme`, qui ne distinguait pas une
     feuille d'un document : une conversation se retrouvait sur le canevas des
     infolettres. Hors carte, la marge est zéro — le texte s'aligne alors sur
     celui de ses voisins, qui n'ont pas de cadre. */
  const marge = carte ? MARGE : 0;
  const canevas = forme === "document" ? 600 : 0;
  const cadre = useRef<HTMLIFrameElement>(null);
  const [hauteur, setHauteur] = useState(220);
  /* La largeur que le message demande. `null` tant qu'on ne sait pas : le cadre
     prend alors toute la place offerte, ce qu'il faisait déjà. */
  const [largeur, setLargeur] = useState<number | null>(null);
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
      `<style>${feuille(carte, Boolean(dark), forme)}</style></head>` +
      `<body><div id="arc-fit">${html}</div>` +
      /* Après le message, pas avant : le `<style>` d'une infolettre est dans le
         corps, et à importance égale c'est l'ordre qui tranche. */
      /* Le sujet entre dans le script comme une **donnée**, pas comme du code :
         `JSON.stringify` échappe les guillemets, et la séquence `</` est
         coupée pour qu'un objet contenant `</script>` ne referme pas la
         balise. */
      /* En bulle, la marge du cadre est **zero** : c'est la bulle qui la donne,
         et deux rembourrages l'un dans l'autre feraient un message perdu au
         milieu de sa propre pastille. Une feuille, elle, est une carte : son
         texte ne colle pas au blanc. */
      `<style>${garde(marge)}</style><script>${script(marge, canevas, forme === "document").replace(
        "__SUJET__",
        JSON.stringify(sujet).replace(/<\//g, "<\\/"),
      )}<\/script></body></html>`,
    [html, sujet, forme, carte, marge, canevas, dark],
  );

  useEffect(() => {
    const ecoute = (e: MessageEvent) => {
      /* Le cadre est d'origine opaque : `origin` vaut « null » et ne prouve
         rien. C'est la fenêtre qui identifie l'émetteur. */
      if (e.source !== cadre.current?.contentWindow) return;
      const data = e.data as {
        type?: string;
        height?: number;
        width?: number;
        phase?: TouchRelaye["phase"];
        x?: number;
        y?: number;
      };
      if (data?.type === "arc-mail-height" && typeof data.height === "number") {
        /* **Plancher à 24, pas à 80.** Il datait du cadre à marge de 16 px, où
           rien ne pouvait légitimement être plus court. Un message court dans
           un fil à plat, lui, fait 57 px de contenu : les 80 imposés lui
           ajoutaient 23 px de vide, que le filet d'accent soulignait jusqu'en
           bas (mesuré : cadre 80, enveloppe 57,25). */
        setHauteur(Math.min(Math.max(Math.ceil(data.height), 24), 20000));
        if (typeof data.width === "number" && data.width > 0) {
          setLargeur(Math.min(Math.ceil(data.width), 20000));
        }
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
    <div
      className={cn(
        "overflow-hidden",
        /* **En bulle, plus de feuille** : la bulle est la surface, et une
           feuille blanche dedans redonnerait le cadre dans le cadre que la
           fiche interdit depuis le premier jour. */
        /* **Une feuille est une bulle qui a gardé sa peau** — donc le même
           rayon, sur les deux plateformes. Elle n'en avait que sur bureau : sur
           téléphone, un message à couleurs posait un rectangle blanc à angles
           vifs, arrêté net au bord de l'écran, à côté de voisins transparents.
           C'est la fiche qui le disait déjà : « même rayon, même largeur, même
           côté qu'une bulle ordinaire ». Et elle ne se lève qu'en sombre. */
        carte && forme === "feuille" && "rounded-xl bg-white ring-1 ring-black/[0.08]",
        /* Le document, lui, **est** la feuille de la carte sur téléphone : à
           bord perdu, sans anneau, un seul cadre. */
        forme === "document" && "bg-white md:mt-4 md:rounded-xl md:ring-1 md:ring-black/[0.08]",
      )}
    >
      {bloquees > 0 && !montrees && (
        /* Dire ce qui est retenu, et pourquoi, plutôt que d'afficher un
           message troué sans explication. */
        <div
          className={cn(
            "flex items-center gap-2 border-b px-3 py-2 text-[13px]",
            carte
              ? "border-black/[0.06] bg-[#f6f6f7] text-[#444]"
              : "border-foreground/10 text-muted-foreground",
          )}
        >
          <ImageOff className="size-4 shrink-0" />
          <span className="min-w-0 flex-1">
            {bloquees} image{bloquees > 1 ? "s" : ""} distante{bloquees > 1 ? "s" : ""} retenue
            {bloquees > 1 ? "s" : ""} — les charger signale la lecture à l&apos;expéditeur.
          </span>
          <button
            type="button"
            onClick={montrer}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 font-medium",
              carte
                ? "bg-white text-[#0b57d0] shadow-[0_0_0_1px_rgb(0_0_0/0.08)]"
                : "bg-foreground/[0.08] text-foreground hover:bg-foreground/[0.13]",
            )}
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
        /* `max-w-full` fait le reste : la largeur demandée est un souhait, la
           bulle et sa borne de 76 % ont le dernier mot. */
        className="block w-full max-w-full border-0"
        style={{ height: hauteur, width: forme !== "document" && largeur ? largeur : undefined }}
      />
    </div>
  );
}
