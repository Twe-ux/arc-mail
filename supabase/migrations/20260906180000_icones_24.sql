-- Vingt-quatre glyphes au lieu de huit.
--
-- La colonne porte la liste en contrainte : ajouter un glyphe dans
-- `SpaceIconName` sans passer ici ferait échouer l'enregistrement du choix,
-- côté serveur, avec une erreur que l'écran ne sait pas traduire.
alter table public.mail_spaces drop constraint if exists mail_spaces_icon_check;

alter table public.mail_spaces
  add constraint mail_spaces_icon_check
  check (icon in (
    'house', 'briefcase', 'building', 'flask', 'code', 'globe', 'at', 'mail',
    'heart', 'users', 'shopping', 'plane', 'bank', 'school', 'camera', 'book',
    'music', 'leaf', 'sparkles', 'tag', 'bell', 'coffee', 'rocket', 'star'
  ));
