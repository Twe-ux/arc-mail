"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

import { useMail } from "@/lib/store";

/**
 * shadcn's Sonner, with the theme read from the store rather than
 * next-themes (the `.dark` class is ours). Sits under the notch on the phone
 * and top-centre on desktop, where the list is.
 */
function Toaster(props: ToasterProps) {
  const dark = useMail((s) => s.dark);
  return (
    <Sonner
      theme={dark ? "dark" : "light"}
      position="top-center"
      offset={{ top: "calc(var(--safe-top) + 12px)" }}
      mobileOffset={{ top: "calc(var(--safe-top) + 8px)", left: 16, right: 16 }}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "!rounded-2xl !border-0 !shadow-lg !ring-1 !ring-black/[0.06] dark:!ring-white/12",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
