-- Les comptes de messagerie d'un utilisateur, et leurs secrets, séparés.
--
-- Deux tables et pas une : `accounts` est lisible par son propriétaire (le
-- navigateur en a besoin pour dresser la liste des comptes), `account_secrets`
-- ne l'est par personne. Une table avec la sécurité au niveau ligne activée et
-- *aucune politique* n'est accessible qu'au rôle de service, c'est-à-dire au
-- serveur. Le mot de passe d'application y arrive déjà chiffré (AES-256-GCM,
-- `src/lib/secret.ts`) : la base ne voit que des octets.

create table if not exists public.accounts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  -- Le vocabulaire de `AccountRef` côté app.
  kind        text not null check (kind in ('imap', 'gmail')),
  -- Ce que l'utilisateur lit dans la liste : « iCloud », « Gmail perso ».
  label       text not null,
  -- L'adresse de la boîte, qui est aussi l'identifiant IMAP.
  email       text not null,
  imap_host   text,
  imap_port   integer,
  smtp_host   text,
  smtp_port   integer,
  created_at  timestamptz not null default now(),
  unique (user_id, email)
);

comment on table public.accounts is
  'Comptes de messagerie. Le secret vit dans account_secrets, hors de portée du client.';

alter table public.accounts enable row level security;

create policy "un compte se lit par son propriétaire"
  on public.accounts for select using (auth.uid() = user_id);
create policy "un compte s''ajoute pour soi"
  on public.accounts for insert with check (auth.uid() = user_id);
create policy "un compte se modifie par son propriétaire"
  on public.accounts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "un compte se retire par son propriétaire"
  on public.accounts for delete using (auth.uid() = user_id);

create index if not exists accounts_user_id_idx on public.accounts (user_id);

create table if not exists public.account_secrets (
  account_id  uuid primary key references public.accounts (id) on delete cascade,
  -- `iv.tag.corps` en base64url ; voir seal()/unseal().
  sealed      text not null,
  updated_at  timestamptz not null default now()
);

comment on table public.account_secrets is
  'Mots de passe d''application chiffrés. Aucune politique : seul le rôle de service y accède.';

-- Activée sans politique : personne, pas même le propriétaire, ne lit cette
-- table depuis le client. C''est le point de la séparation.
alter table public.account_secrets enable row level security;
