#!/usr/bin/env python3
"""
Le favicon, tiré de l'icône de l'app.

    python3 scripts/favicon.py     (demande Pillow : pip install Pillow)

Il n'y a pas de marque à dessiner ici : l'icône de l'app existe, elle est
choisie, et l'onglet doit montrer **la même**. Le script la réduit, c'est tout —
un dessin à part finirait par diverger de celui qu'on voit sur l'écran d'accueil.

Deux ajustements aux petites tailles, mesurés à l'œil aux tailles réelles :
la marque est **rognée** (donc agrandie) à 16 et 32 px, sinon l'enveloppe se
perd dans la tuile ; et tout part du 512 en LANCZOS, parce que réduire d'un coup
depuis le grand donne des bords propres.
"""

import struct
from io import BytesIO
from pathlib import Path

from PIL import Image

RACINE = Path(__file__).resolve().parent.parent
SOURCE = RACINE / "public/icons/icon-512.png"
CIBLE = RACINE / "src/app/favicon.ico"

# (taille, rognage) : ce qu'on retire de chaque bord, en part du côté.
PLANS = [(16, 0.10), (32, 0.06), (48, 0.0)]


def plan(master: Image.Image, taille: int, rogne: float) -> bytes:
    m = master
    if rogne:
        bord = round(m.width * rogne)
        m = m.crop((bord, bord, m.width - bord, m.height - bord))
    buf = BytesIO()
    m.resize((taille, taille), Image.LANCZOS).save(buf, format="PNG")
    return buf.getvalue()


def main():
    master = Image.open(SOURCE).convert("RGBA")
    pngs = [(t, plan(master, t, r)) for t, r in PLANS]

    # Un `.ico` n'est qu'un en-tête, un annuaire, et des PNG à la suite —
    # Pillow ne sait pas y mettre un dessin différent par taille.
    entete = struct.pack("<HHH", 0, 1, len(pngs))
    offset = len(entete) + 16 * len(pngs)
    annuaire, corps = b"", b""
    for taille, data in pngs:
        annuaire += struct.pack("<BBBBHHII", taille, taille, 0, 0, 1, 32, len(data), offset)
        corps += data
        offset += len(data)

    CIBLE.write_bytes(entete + annuaire + corps)
    print(f"{CIBLE.relative_to(RACINE)}  " + ", ".join(f"{t}×{t}" for t, _ in pngs))


if __name__ == "__main__":
    main()
