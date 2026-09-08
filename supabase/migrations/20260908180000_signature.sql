-- La signature d'un espace, celle qu'un message emporte.
--
-- POURQUOI ELLE ARRIVE MAINTENANT. `Space.signature` existait depuis le
-- premier jour dans le type et n'était écrit **que par les données mock** :
-- l'outil « Insérer la signature » du composeur répondait « Cet espace n'a pas
-- encore de signature » sur toute vraie boîte, et le menu du compte promettait
-- « Comptes et signatures » vers un écran qui n'en réglait aucune. Une
-- promesse sans rien derrière — c'est le paquet de `docs/a-faire.md` qu'on
-- vide.
--
-- POURQUOI SUR L'ESPACE ET NON SUR LE COMPTE. C'est l'espace qui porte son
-- identité (`identity_name`, `identity_email`, juste à côté) : c'est lui qui
-- signe un message, pas la boîte qui le transporte. Deux domaines sur un même
-- compte iCloud n'ont aucune raison de signer pareil.
--
-- `not null default ''` : une signature vide est l'état normal, pas une
-- absence. `text` et non `varchar(n)` — personne ne sait à l'avance combien de
-- lignes tient une signature, et Postgres ne gagne rien à la borner.

alter table public.mail_spaces
  add column if not exists signature text not null default '';

comment on column public.mail_spaces.signature is
  'Ce que « Insérer la signature » ajoute à un message écrit depuis cet espace.';
