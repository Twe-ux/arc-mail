import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { colorFor, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Contact } from "@/lib/types";

export function ContactAvatar({ contact, className }: { contact: Contact; className?: string }) {
  return (
    <Avatar className={cn("size-9", className)}>
      <AvatarFallback
        className="text-xs font-semibold text-white"
        style={{ backgroundColor: colorFor(contact.email) }}
      >
        {initials(contact.name)}
      </AvatarFallback>
    </Avatar>
  );
}
