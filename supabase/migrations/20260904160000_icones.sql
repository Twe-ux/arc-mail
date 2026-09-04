-- Huit icônes au lieu de trois.
--
-- « maison, mallette, fiole » couvrait les trois espaces d'exemple, pas les
-- boîtes de quelqu'un : dès qu'on peut renommer un espace, on veut aussi
-- choisir son glyphe, et trois n'est pas un choix.
--
-- La contrainte est refaite plutôt qu'abandonnée : c'est elle qui garantit que
-- `SPACE_ICONS` sait dessiner ce que la base contient.

alter table public.mail_spaces drop constraint if exists mail_spaces_icon_check;

alter table public.mail_spaces
  add constraint mail_spaces_icon_check
  check (icon in ('house', 'briefcase', 'flask', 'globe', 'heart', 'sparkles', 'book', 'tag'));
