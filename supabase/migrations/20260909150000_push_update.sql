-- La politique qui manquait : un appareil qui se réinscrit.
--
-- `push_subscriptions` avait `select`, `insert` et `delete`, et la route
-- enregistre par un **`upsert` sur `endpoint`** — précisément pour qu'une
-- réinscription ne crée pas un doublon qu'on notifierait deux fois. Mais un
-- `upsert` qui retombe sur une ligne existante fait un `UPDATE`, et sans
-- politique la sécurité au niveau ligne le refuse.
--
-- Le premier abonnement d'un appareil passait donc (c'est un `insert`), et le
-- second — après une réinstallation, ou une permission reprise — échouait sans
-- que rien ne le dise, sinon le toast. Trouvé en relisant, pas à l'usage.
create policy "ses appareils se mettent à jour"
  on public.push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
