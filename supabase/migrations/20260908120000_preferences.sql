-- Les préférences suivent le compte, pas le navigateur.
--
-- Signalé après une reconnexion : « mes choix n'ont pas tout été appliqués ».
-- Ils vivaient dans `localStorage` sous la clé `arc-mail`, donc **par
-- navigateur** : entrer depuis un autre appareil, ou depuis le navigateur
-- qu'un lien de connexion a ouvert à la place du précédent, c'était repartir
-- des valeurs par défaut. Rien n'était perdu — c'était rangé ailleurs.
--
-- Une ligne par personne, et un `jsonb` plutôt qu'une colonne par réglage.
-- C'est un choix, pas de la paresse : le jeu de préférences bouge à chaque
-- semaine de ce projet, une colonne par réglage voudrait dire une migration
-- par réglage, et personne n'interroge jamais ces valeurs une par une — elles
-- se lisent et s'écrivent en bloc, par un seul client.
--
-- **Ce qui n'est PAS ici, et pourquoi** : l'état de la barre latérale et la
-- largeur des colonnes (ils décrivent un écran, pas un goût — un rail n'a
-- aucun sens sur un téléphone), les fils en cache et la liste des boîtes (des
-- copies du serveur, qui se relisent), les récents (une trace de navigation).
-- Tout cela reste dans `localStorage`, où c'est juste.

create table if not exists public.user_prefs (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  -- `themes`, `dark`, `listDensity`, `fondBureau`, `groupBy`, `vues`.
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.user_prefs is
  'Les réglages d''interface d''une personne, en bloc. Suivent le compte, pas le navigateur.';

alter table public.user_prefs enable row level security;

create policy "ses préférences se lisent"
  on public.user_prefs for select using (auth.uid() = user_id);
create policy "ses préférences s''écrivent"
  on public.user_prefs for insert with check (auth.uid() = user_id);
create policy "ses préférences se mettent à jour"
  on public.user_prefs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
