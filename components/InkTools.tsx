"use client";

import { ArrowUUpLeft, Eraser, Trash } from "@phosphor-icons/react";

export function InkTools({
  erasing,
  hasInk,
  canUndo,
  disabled = false,
  cellLabel = "這格",
  compact = false,
  onEraser,
  onUndo,
  onClear,
}: {
  erasing: boolean;
  hasInk: boolean;
  canUndo: boolean;
  disabled?: boolean;
  cellLabel?: string;
  compact?: boolean;
  onEraser: () => void;
  onUndo: () => void;
  onClear: () => void;
}) {
  return (
    <div
      className={`ink-tools${compact ? " is-compact" : ""}`}
      role="group"
      aria-label={`${cellLabel}筆跡工具`}
    >
      <button
        type="button"
        className={`ink-tool ink-eraser${erasing ? " is-active" : ""}`}
        aria-label={`圈選擦除${cellLabel}`}
        aria-pressed={erasing}
        title={erasing ? "取消圈選，繼續寫" : "圈選擦除"}
        disabled={disabled || !hasInk}
        onClick={() => onEraser()}
      >
        <Eraser size={21} aria-hidden="true" />
        {!compact && <span>{erasing ? "繼續寫" : "圈選擦除"}</span>}
      </button>
      <button
        type="button"
        className="ink-tool ink-undo"
        aria-label={`復原${cellLabel}筆跡`}
        title="復原上一個動作"
        disabled={disabled || !canUndo}
        onClick={() => onUndo()}
      >
        <ArrowUUpLeft size={21} aria-hidden="true" />
        {!compact && <span>復原</span>}
      </button>
      <button
        type="button"
        className="ink-tool ink-clear"
        aria-label={`清空${cellLabel}`}
        title="清空整格，可復原"
        disabled={disabled || !hasInk}
        onClick={() => onClear()}
      >
        <Trash size={19} aria-hidden="true" />
        {!compact && <span>清空</span>}
      </button>
    </div>
  );
}

export function InkNotice({
  erasing,
  notice,
  cellLabel = "",
}: {
  erasing: boolean;
  notice: string;
  cellLabel?: string;
}) {
  return (
    <p className={`ink-notice${erasing ? " is-erasing" : ""}`} role="status" aria-atomic="true">
      {erasing
        ? `${cellLabel ? `${cellLabel}：` : ""}圈住想擦掉的地方，放開就擦除；再按橡皮擦可取消。`
        : notice || "擦錯了可以按復原，再繼續寫。"}
    </p>
  );
}

export function InkStatus({ message }: { message: string }) {
  return (
    <p className="ink-status" role="status" aria-atomic="true">
      {message}
    </p>
  );
}
