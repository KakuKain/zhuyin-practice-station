import type { ReactNode } from "react";

/**
 * The app's confirmation modal. The primary (focused) choice always keeps the child's
 * current work; the secondary choice is the one that leaves or discards it.
 */
export function ConfirmDialog({
  id,
  eyebrow,
  title,
  children,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel: string;
  onSecondary: () => void;
}) {
  return (
    <div className="fill-dialog-backdrop">
      <div
        className="fill-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
      >
        <span className="fill-dialog-eyebrow">{eyebrow}</span>
        <h2 id={`${id}-title`}>{title}</h2>
        <p id={`${id}-description`}>{children}</p>
        <button className="fill-dialog-primary" type="button" autoFocus onClick={onPrimary}>
          {primaryLabel}
        </button>
        <button className="fill-dialog-secondary" type="button" onClick={onSecondary}>
          {secondaryLabel}
        </button>
      </div>
    </div>
  );
}
