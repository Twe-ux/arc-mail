-- Le visage du compte : un seul fichier par personne, dans un seau privé.
--
-- POURQUOI UN SEAU **PRIVÉ**. Un seau public rendrait la photo lisible par
-- quiconque devine son chemin — et le chemin, ici, contient l'identifiant de
-- la personne. Ce dépôt retient déjà les images distantes d'un courrier pour
-- ne pas annoncer une lecture (fiche IMAP) ; poser sa propre photo sur une
-- URL ouverte serait le contraire du même soin. Le serveur signe une URL à
-- chaque rendu (`lireProfil`), et la signature est ce qui remplace l'ACL.
--
-- POURQUOI UN CHEMIN PAR PERSONNE. `<uid>/avatar.webp` : le premier segment
-- est l'identifiant, et c'est **lui** que les politiques comparent à
-- `auth.uid()`. Un nom de fichier fixe plutôt qu'un aléatoire — on n'en garde
-- qu'un, l'`upsert` remplace, et rien ne traîne derrière.
--
-- CE QUE LE SEAU REFUSE LUI-MÊME. Le téléversement part du **navigateur**
-- (les octets ne traversent pas notre serveur, RLS suffit) : les garde-fous
-- ne peuvent donc pas vivre seulement dans le formulaire. Le seau borne le
-- poids et les types ; le client réduit déjà à 256 px de WebP, ce qui pèse
-- une trentaine de kilo-octets, et 512 Ko laisse de la marge sans laisser
-- passer une photo d'appareil.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  524288,
  array['image/webp', 'image/png', 'image/jpeg']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Quatre politiques, un seul prédicat : « le dossier porte mon identifiant ».
-- `storage.foldername(name)` rend les segments du chemin ; le premier est le
-- dossier. Sans `bucket_id`, la politique parlerait de tous les seaux.

create policy "son avatar se lit"
  on storage.objects for select
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "son avatar se pose"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "son avatar se remplace"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "son avatar se retire"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
