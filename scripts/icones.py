#!/usr/bin/env python3
"""
Les icônes d'Arc Mail, dessinées d'un seul geste.

    python3 scripts/icones.py     (demande Pillow : pip install Pillow)

Une seule marque, déclinée : le **dégradé de Perso** — la signature de l'app,
celle de l'écran de connexion et du fond de bureau — et une **enveloppe blanche
dont le rabat est creusé**, pas tracé.

Pourquoi creusé : un rabat en trait fait un pixel et demi à 16 px, et le pli se
confond avec le corps de l'enveloppe. En le retirant du blanc, c'est le dégradé
lui-même qui dessine le V : deux formes au lieu de trois, un contraste garanti,
et le même dessin à toutes les tailles. Mesuré à l'œil aux tailles réelles, pas
supposé.

Tout part d'un master à 1024 réduit en LANCZOS : dessiner directement à 16 px
donne des bords sales.
"""

import struct
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw

RACINE = Path(__file__).resolve().parent.parent
M = 1024

# Les trois arrêts du dégradé de Perso (`src/lib/mock-data.ts`), à 135°.
ARRETS = [(0.00, (0x7C, 0x3A, 0xED)), (0.55, (0xDB, 0x27, 0x77)), (1.00, (0xF9, 0x73, 0x16))]

# Le coin des tuiles iOS, en part du côté. La famille des grands rayons de l'app.
ARRONDI = 0.2237


def melange(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def degrade():
    """135° : du coin haut-gauche au coin bas-droit, comme `--space-gradient`."""
    im = Image.new("RGB", (M, M))
    px = im.load()
    for y in range(M):
        for x in range(M):
            t = (x + y) / (2 * (M - 1))
            for i in range(len(ARRETS) - 1):
                p0, c0 = ARRETS[i]
                p1, c1 = ARRETS[i + 1]
                if t <= p1 or i == len(ARRETS) - 2:
                    px[x, y] = melange(c0, c1, min(1, max(0, (t - p0) / (p1 - p0))))
                    break
    return im.convert("RGBA")


def enveloppe(echelle=1.0):
    """Le blanc, et le rabat retiré dedans. Rendue en RGBA avec un vrai trou."""
    layer = Image.new("RGBA", (M, M), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    demi_l, demi_h = M * 0.30 * echelle, M * 0.215 * echelle
    cx = cy = M / 2
    x0, y0, x1, y1 = cx - demi_l, cy - demi_h, cx + demi_l, cy + demi_h
    d.rounded_rectangle((x0, y0, x1, y1), radius=M * 0.06 * echelle, fill=(255, 255, 255, 255))

    # Le rabat part juste à l'intérieur des coins arrondis, pour ne pas les
    # entamer, et descend à mi-hauteur : plus bas, la marque se lit « M ».
    marge = (x1 - x0) * 0.11
    d.polygon(
        [(x0 + marge, y0 - 2), (cx, y0 + (y1 - y0) * 0.50), (x1 - marge, y0 - 2)],
        fill=(0, 0, 0, 0),
    )
    return layer


def coins(rayon):
    grand = Image.new("L", (M, M), 0)
    ImageDraw.Draw(grand).rounded_rectangle((0, 0, M - 1, M - 1), radius=round(M * rayon), fill=255)
    return grand


def master(arrondi=ARRONDI, echelle=1.0):
    """`arrondi = 0` : carré plein — Apple et le masquable posent leur propre masque."""
    base = degrade()
    marque = enveloppe(echelle)
    # `paste` avec le canal alpha de la marque : le creux doit **remplacer** le
    # blanc, pas se fondre dessus.
    base.paste(marque, (0, 0), marque.split()[3])
    if arrondi:
        base.putalpha(coins(arrondi))
    return base


def ecrire(im, chemin, taille):
    cible = RACINE / chemin
    im.resize((taille, taille), Image.LANCZOS).save(cible)
    print(f"  {chemin}  {taille}×{taille}")


def ecrire_ico(chemin, plans):
    """
    Un `.ico` qui porte trois dessins, pas un réduit trois fois.

    Aux petites tailles la marque est agrandie et la tuile moins arrondie : sans
    cela l'enveloppe se noie dans les coins. Pillow ne sait pas mettre une image
    différente par taille dans un `.ico`, alors on assemble le conteneur nous-mêmes
    — ce n'est qu'un en-tête, un annuaire, et des PNG à la suite.
    """
    pngs = []
    for taille, echelle, arrondi in plans:
        buf = BytesIO()
        master(arrondi=arrondi, echelle=echelle).resize((taille, taille), Image.LANCZOS).save(
            buf, format="PNG"
        )
        pngs.append((taille, buf.getvalue()))

    entete = struct.pack("<HHH", 0, 1, len(pngs))
    offset = len(entete) + 16 * len(pngs)
    annuaire, corps = b"", b""
    for taille, data in pngs:
        annuaire += struct.pack("<BBBBHHII", taille, taille, 0, 0, 1, 32, len(data), offset)
        corps += data
        offset += len(data)

    (RACINE / chemin).write_bytes(entete + annuaire + corps)
    print(f"  {chemin}  " + ", ".join(f"{t}×{t}" for t, _ in pngs))


def main():
    tuile = master()
    carre = master(arrondi=0)
    # Masquable : la zone sûre est les 80 % centraux, la marque doit y tenir.
    masquable = master(arrondi=0, echelle=0.78)

    print("Icônes :")
    ecrire(tuile, "src/app/icon.png", 512)
    ecrire(carre, "src/app/apple-icon.png", 180)
    ecrire(tuile, "public/icons/icon-192.png", 192)
    ecrire(tuile, "public/icons/icon-512.png", 512)
    ecrire(masquable, "public/icons/icon-maskable-512.png", 512)
    ecrire_ico("src/app/favicon.ico", [(16, 1.18, 0.17), (32, 1.08, 0.20), (48, 1.0, ARRONDI)])


if __name__ == "__main__":
    main()
