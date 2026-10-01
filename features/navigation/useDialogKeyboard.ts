"use client";
import { useEffect, useEffectEvent } from "react";

export function useDialogKeyboard(open: boolean, onCancel: () => void) {
  const cancel = useEffectEvent(onCancel);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cancel();
        return;
      }
      if (event.key !== "Tab") return;
      const buttons = Array.from(
        document.querySelectorAll<HTMLButtonElement>(".fill-dialog button:not(:disabled)"),
      );
      if (!buttons.length) return;
      const first = buttons[0],
        last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      // A closed dialog must not leave keyboard focus on a removed button.
      requestAnimationFrame(() => {
        if (document.querySelector(".fill-dialog")) return;
        if (document.activeElement !== document.body) return;
        const heading = document.querySelector<HTMLElement>("main h1");
        if (heading) {
          heading.tabIndex = -1;
          heading.focus({ preventScroll: true });
        }
      });
    };
  }, [open]);
}
