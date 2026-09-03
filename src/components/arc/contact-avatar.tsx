import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { hueFor, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Contact } from "@/lib/types";

export function ContactAvatar({ contact, className }: { contact: Contact; className?: string }) {
  const h = hueFor(contact.email);
  return (
    <Avatar className={cn("size-9", className)}>
      <AvatarFallback
        className="text-xs font-semibold text-white"
        style={{
          background: `linear-gradient(135deg, oklch(0.78 0.12 ${h}), oklch(0.58 0.17 ${(h + 40) % 360}))`,
        }}
      >
        {initials(contact.name)}
      </AvatarFallback>
    </Avatar>
  );
}
