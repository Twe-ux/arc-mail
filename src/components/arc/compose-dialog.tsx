"use client";

import { useState } from "react";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { selectSpace, useMail } from "@/lib/store";

export function ComposeDialog() {
  const open = useMail((s) => s.composeOpen);
  const setComposeOpen = useMail((s) => s.setComposeOpen);
  const sendMail = useMail((s) => s.sendMail);
  const space = useMail(selectSpace);

  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const reset = () => {
    setTo("");
    setSubject("");
    setBody("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!to.trim()) return;
    sendMail({ to: to.trim(), subject, body });
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={setComposeOpen}>
      <DialogContent className="gap-0 overflow-hidden p-0 max-sm:inset-0 max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none sm:max-w-2xl">
        <form onSubmit={submit} className="flex h-full flex-col">
          <DialogHeader className="border-b px-5 py-3">
            <DialogTitle className="text-sm">Nouveau message</DialogTitle>
            <DialogDescription className="text-xs">
              Depuis {space.emoji} {space.name} · {space.email}
            </DialogDescription>
          </DialogHeader>

          <Field label="À">
            <input
              type="email"
              required
              autoFocus
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="nom@exemple.fr"
              className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm"
            />
          </Field>
          <Field label="Objet">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Objet du message"
              className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm"
            />
          </Field>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") e.currentTarget.form?.requestSubmit();
            }}
            placeholder="Écris ton message…"
            className="min-h-56 flex-1 resize-none rounded-none border-0 px-5 py-4 shadow-none focus-visible:ring-0 sm:flex-none dark:bg-transparent"
          />

          <DialogFooter className="border-t px-5 py-3 pb-[max(0.75rem,calc(env(safe-area-inset-bottom)-10px))] sm:justify-between">
            <span className="hidden self-center text-xs text-muted-foreground sm:inline">
              Mode démo : le message est ajouté au dossier Envoyés.
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setComposeOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">
                <Send /> Envoyer
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex h-11 shrink-0 items-center gap-3 border-b px-5 text-sm">
      <span className="w-12 shrink-0 text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
