import { Check, ArrowCounterClockwise, Star } from "@phosphor-icons/react";

export function ReviewActions({
  onCorrect,
  onRetry,
  correctDisabled = false,
}: {
  onCorrect: () => void;
  onRetry: () => void;
  correctDisabled?: boolean;
}) {
  return (
    <div className="review-actions">
      <button
        type="button"
        className="review-correct"
        disabled={correctDisabled}
        onClick={onCorrect}
      >
        <Check size={20} weight="bold" aria-hidden="true" />
        答對
      </button>
      <button type="button" className="review-retry" onClick={onRetry}>
        <ArrowCounterClockwise size={20} weight="bold" aria-hidden="true" />
        需要補強
      </button>
    </div>
  );
}

export function FavoriteButton({
  saved,
  onToggle,
  className = "review-save",
  ariaLabel,
  label,
  iconOnly = false,
}: {
  saved: boolean;
  onToggle: () => void;
  className?: string;
  ariaLabel?: string;
  label?: string;
  iconOnly?: boolean;
}) {
  return (
    <button
      type="button"
      className={`${className} ${saved ? "is-saved is-favorite" : "not-favorite"}`}
      aria-label={ariaLabel}
      aria-pressed={saved}
      onClick={onToggle}
    >
      <Star size={20} weight={saved ? "fill" : "regular"} aria-hidden="true" />
      {!iconOnly && (label ?? (saved ? "已收藏 · 取消收藏" : "收藏這題，之後再練"))}
    </button>
  );
}
