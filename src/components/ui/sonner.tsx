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
      /* **Par les variables de Sonner, pas par des classes.** Sa feuille est
         injectée à l'exécution, donc *après* celle de Tailwind : à specificité
         égale (`[data-sonner-toast]` vaut une classe) c'est elle qui gagne, et
         un fond posé en classe ne prenait pas — mesuré, le toast restait blanc
         avec du texte blanc dessus. `background` accepte un dégradé, ces
         variables aussi. */
      style={
        {
          /* Le même habillage que les actions primaires : le dégradé de
             l'espace sous l'aplat sombre de `space-backdrop`. À L≈0.7 les
             teintes claires (ambre, or) ne portaient pas du blanc ; 12 % de
             noir le rattrapent sans changer la couleur. */
          "--normal-bg":
            "linear-gradient(rgb(0 0 0 / 0.12), rgb(0 0 0 / 0.12)), var(--space-gradient)",
          "--normal-text": "#fff",
          "--normal-border": "transparent",
          /* Un échec ne se dit pas dans la couleur de l'espace : il se lirait
             comme une réussite. */
          "--error-bg": "var(--destructive)",
          "--error-text": "#fff",
          "--error-border": "transparent",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "!rounded-2xl !shadow-lg",
          /* Un toast n'a qu'une phrase, et un mot calé à gauche sur une bande
             de 361 px se lit comme une étiquette oubliée. */
          content: "w-full",
          title: "w-full text-center font-semibold",
          description: "w-full text-center opacity-85",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
