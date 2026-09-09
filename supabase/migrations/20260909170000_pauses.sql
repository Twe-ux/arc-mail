-- Les pauses suivent le compte, et le serveur peut les réveiller.
--
-- « En pause » vivait dans `localStorage` : donc **par navigateur**, et la
-- promesse ne tenait que là où elle avait été faite. Un fil mis en pause sur
-- l'iPhone ne revenait pas sur le bureau, et un appareil qu'on n'ouvre plus
-- gardait la sienne pour toujours. L'interface le disait — « il revient à
-- l'ouverture » — plutôt que de le cacher, mais ça restait une fonction à
-- moitié.
--
-- Maintenant que le tour de relève existe, il peut faire l'autre moitié :
-- prévenir à l'heure dite. D'où une ligne par promesse, plutôt qu'un `jsonb`
-- dans `user_prefs` — le tour interroge **par date** (`wake <= now()`), ce
-- qu'un bloc de préférences ne sait pas faire.
--
-- `titre` et `objet` sont **une copie** de l'enveloppe, prise au moment de la
-- pause : la notification doit pouvoir être écrite sans ouvrir la boîte, et
-- réveiller quelqu'un pour un `FETCH` de plus serait payer cher un nom qu'on
-- connaissait déjà.
create table if not exists public.mail_pauses (
  user_id    uuid not null references auth.users (id) on delete cascade,
  -- L'identifiant du fil, « chemin uid » : le même que dans le store.
  thread_id  text not null,
  wake       timestamptz not null,
  -- De quoi écrire la notification sans relire la boîte.
  titre      text,
  objet      text,
  created_at timestamptz not null default now(),
  primary key (user_id, thread_id)
);

create index if not exists mail_pauses_wake on public.mail_pauses (wake);

comment on table public.mail_pauses is
  'Les fils mis en pause. Une ligne par promesse ; le tour de relève les réveille à l''heure.';

alter table public.mail_pauses enable row level security;

create policy "ses pauses se lisent"
  on public.mail_pauses for select using (auth.uid() = user_id);
create policy "ses pauses s''ajoutent"
  on public.mail_pauses for insert with check (auth.uid() = user_id);
create policy "ses pauses se déplacent"
  on public.mail_pauses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ses pauses s''oublient"
  on public.mail_pauses for delete using (auth.uid() = user_id);
