"use client";

import { useId, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

import { isEmail } from "@/lib/format";
import type { Contact } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ContactAvatar } from "./contact-avatar";

/**
 * Addresses as chips, typed or picked from the people we already write to.
 * Enter, comma, semicolon or leaving the field commit what was typed; Backspace
 * on an empty field removes the last chip.
 */
export function RecipientField({
  label,
  value,
  onChange,
  suggestions,
  autoFocus,
  trailing,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  suggestions: Contact[];
  autoFocus?: boolean;
  trailing?: React.ReactNode;
}) {
  const [text, setText] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const byEmail = useMemo(() => new Map(suggestions.map((c) => [c.email, c])), [suggestions]);
  const query = text.trim().toLowerCase();
  const matches = useMemo(
    () =>
      query
        ? suggestions
            .filter(
              (c) =>
                !value.includes(c.email) &&
                (c.name.toLowerCase().includes(query) || c.email.toLowerCase().includes(query)),
            )
            .slice(0, 5)
        : [],
    [query, suggestions, value],
  );
  const showList = focused && matches.length > 0;

  const add = (email: string) => {
    if (!value.includes(email)) onChange([...value, email]);
    setText("");
    setInvalid(false);
    setHighlight(0);
  };

  const commit = () => {
    const raw = text.trim().replace(/[,;]+$/, "");
    if (!raw) return;
    if (isEmail(raw)) add(raw.toLowerCase());
    else setInvalid(true);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && showList) {
      e.preventDefault();
      setHighlight((h) => (h + 1) % matches.length);
    } else if (e.key === "ArrowUp" && showList) {
      e.preventDefault();
      setHighlight((h) => (h - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter" || e.key === "," || e.key === ";" || (e.key === "Tab" && text)) {
      if (e.key !== "Tab") e.preventDefault();
      if (showList) add(matches[highlight].email);
      else commit();
    } else if (e.key === "Backspace" && !text && value.length) {
      onChange(value.slice(0, -1));
    } else if (e.key === "Escape" && showList) {
      e.stopPropagation();
      setFocused(false);
    }
  };

  return (
    <div
      className="relative flex min-h-11 cursor-text flex-wrap items-center gap-1.5 border-b border-border/60 px-4 py-1.5 sm:px-5"
      onClick={() => inputRef.current?.focus()}
    >
      <span className="w-10 shrink-0 text-sm text-muted-foreground">{label}</span>
      {value.map((email) => {
        const contact = byEmail.get(email);
        return (
          <span
            key={email}
            className="inline-flex h-7 max-w-full items-center gap-1 rounded-full bg-muted py-0.5 pr-1 pl-1 text-sm"
          >
            <ContactAvatar contact={contact ?? { name: email, email }} className="size-5 [&_[data-slot=avatar-fallback]]:text-[9px]" />
            <span className="truncate">{contact?.name ?? email}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(value.filter((v) => v !== email));
              }}
              aria-label={`Retirer ${contact?.name ?? email}`}
              className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </span>
        );
      })}
      <input
        ref={inputRef}
        value={text}
        autoFocus={autoFocus}
        onChange={(e) => {
          setText(e.target.value);
          setInvalid(false);
          setHighlight(0);
        }}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        type="text"
        inputMode="email"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        role="combobox"
        aria-label={label}
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid || undefined}
        placeholder={value.length ? "" : "nom@exemple.fr"}
        className={cn(
          "h-7 min-w-28 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm",
          invalid && "text-destructive underline decoration-wavy",
        )}
      />
      {trailing}
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full right-4 left-14 z-10 mt-1 overflow-hidden rounded-xl border bg-popover py-1 shadow-lg sm:left-16"
        >
          {matches.map((c, i) => (
            <li
              key={c.email}
              role="option"
              aria-selected={i === highlight}
              onMouseDown={(e) => {
                e.preventDefault();
                add(c.email);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={cn(
                "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm",
                i === highlight && "bg-accent",
              )}
            >
              <ContactAvatar contact={c} className="size-7 [&_[data-slot=avatar-fallback]]:text-[10px]" />
              <span className="min-w-0">
                <span className="block truncate font-medium">{c.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{c.email}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
