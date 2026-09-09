-- Les notifications push : à qui pousser, et à partir d'où.
--
-- Deux tables, et elles ne se ressemblent pas : la première appartient à la
-- personne (elle la lit, l'écrit, la retire depuis son navigateur), la seconde
-- n'appartient qu'au serveur — c'est la mémoire d'un travail de fond.

-- ── À qui pousser ───────────────────────────────────────────────────────
--
-- Une souscription Web Push est **par appareil**, pas par compte : un iPhone
-- et un bureau en ont chacun la leur, et la même personne en a donc plusieurs.
-- `endpoint` est l'adresse chez Apple ou Google, unique — c'est elle qui
-- identifie l'appareil, pas nous.
--
-- `p256dh` et `auth` sont les clés **publiques** du navigateur : la charge
-- utile est chiffrée avec elles, de bout en bout. Apple relaie un bloc qu'il
-- ne peut pas lire, et nous ne gardons rien qui permette de déchiffrer ce
-- qu'on a envoyé.
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  -- De quoi reconnaître un appareil dans une liste, rien de plus.
  appareil   text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user on public.push_subscriptions (user_id);

comment on table public.push_subscriptions is
  'Les appareils qui veulent être prévenus. Une par appareil, jamais par compte.';

alter table public.push_subscriptions enable row level security;

create policy "ses appareils se lisent"
  on public.push_subscriptions for select using (auth.uid() = user_id);
create policy "ses appareils s''ajoutent"
  on public.push_subscriptions for insert with check (auth.uid() = user_id);
create policy "ses appareils se retirent"
  on public.push_subscriptions for delete using (auth.uid() = user_id);

-- ── À partir d'où ───────────────────────────────────────────────────────
--
-- Le repère de la relève : ce que la boîte annonçait la dernière fois qu'on a
-- regardé. `UIDNEXT` est le numéro que portera le prochain message ; tout ce
-- qui est arrivé depuis est au-dessus du repère.
--
-- `UIDVALIDITY` est ce qui rend le repère lisible : s'il change, la boîte a
-- été renumérotée et les UID d'avant ne veulent plus rien dire. On repart
-- alors du nouveau `UIDNEXT` **sans rien notifier** — la boîte n'a pas reçu
-- cent messages, elle a changé de numérotation.
--
-- **Aucune politique** : cette table ne se lit et ne s'écrit que par la clé de
-- service, depuis le tour de relève. Comme `account_secrets`, mais pour une
-- autre raison — non pas parce que c'est secret, mais parce que personne
-- d'autre n'en a l'usage, et qu'un repère écrit depuis un navigateur ferait
-- taire les notifications de quelqu'un.
create table if not exists public.mail_watermarks (
  account_id  uuid not null references public.accounts (id) on delete cascade,
  path        text not null,
  uidvalidity bigint not null,
  uidnext     bigint not null,
  seen_at     timestamptz not null default now(),
  primary key (account_id, path)
);

comment on table public.mail_watermarks is
  'Où en était la relève. Serveur seulement : aucune politique, comme account_secrets.';

alter table public.mail_watermarks enable row level security;
