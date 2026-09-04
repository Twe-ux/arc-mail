-- Les espaces : un dossier vu et vécu comme une boîte de réception.
--
-- Un compte iCloud porte une seule INBOX, mais plusieurs adresses : les
-- domaines personnalisés sont des alias, et une règle iCloud range leur
-- courrier dans un dossier. Un espace dit « ce dossier-là est ma réception, et
-- j'écris depuis cette adresse-là ». Sans lui, tout arrive mêlé.
--
-- Aucune ligne pour un compte = un espace par défaut sur INBOX, fabriqué à la
-- volée (voir `spacesFromAccounts`). On ne remplit pas la table pour rien.

create table if not exists public.mail_spaces (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  account_id   uuid not null references public.accounts (id) on delete cascade,
  -- Ce qu'on lit dans la barre latérale.
  name         text not null,
  icon         text not null default 'briefcase' check (icon in ('house', 'briefcase', 'flask')),
  -- Le chemin IMAP qui tient lieu de réception. « INBOX » pour l'espace principal.
  inbox_path   text not null default 'INBOX',
  -- L'expéditeur quand on écrit depuis cet espace.
  identity_name  text not null,
  identity_email text not null,
  -- L'ordre d'affichage ; les raccourcis ⌘1-3 le suivent.
  position     integer not null default 0,
  created_at   timestamptz not null default now(),
  unique (account_id, inbox_path)
);

comment on table public.mail_spaces is
  'Un dossier IMAP présenté comme une réception, avec son identité d''envoi.';

alter table public.mail_spaces enable row level security;

create policy "un espace se lit par son propriétaire"
  on public.mail_spaces for select using (auth.uid() = user_id);
create policy "un espace s''ajoute pour soi"
  on public.mail_spaces for insert with check (auth.uid() = user_id);
create policy "un espace se modifie par son propriétaire"
  on public.mail_spaces for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "un espace se retire par son propriétaire"
  on public.mail_spaces for delete using (auth.uid() = user_id);

create index if not exists mail_spaces_user_id_idx on public.mail_spaces (user_id);
