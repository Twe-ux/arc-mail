"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

/** Ce que l'interface a le droit de savoir de la personne connectée : de quoi l'afficher. */
export type Session = { email: string; name: string | null; avatar: string | null };

const SessionContext = createContext<Session | null>(null);

/**
 * La session descend du serveur, elle ne se redemande pas côté client : c'est
 * `page.tsx` qui l'a déjà validée auprès de Supabase, et un second aller-retour
 * ne dirait rien de plus. `null` = personne, ou Supabase pas configuré.
 */
export function SessionProvider({ session, children }: { session: Session | null; children: ReactNode }) {
  const value = useMemo(() => session, [session]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session | null {
  return useContext(SessionContext);
}
