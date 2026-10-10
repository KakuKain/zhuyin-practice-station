import { ShowMsg } from "./ShowMsg";
import { createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { loadLatestVersion, useUpdateStatus } from "../lib/loading/app-update";

/** The header's back-button slot, so a panel deep in the page can put its back action there. */
export const HeaderBackSlot = createContext<HTMLElement | null>(null);

export function HeaderBack({ label, onBack }: { label: string; onBack: () => void }) {
  const target = useContext(HeaderBackSlot);
  return target
    ? createPortal(
        <button className="header-back" type="button" onClick={onBack}>
          <ArrowLeft size={18} weight="bold" aria-hidden="true" />
          <span>{label}</span>
        </button>,
        target,
      )
    : null;
}

import type { InkStroke, View } from "../features/types";
import { inkOutline } from "../lib/ink/ink-brush";
import { ArrowLeft, BookOpenText, Gear, PencilLine, SquaresFour } from "@phosphor-icons/react";

export function InkPreview({ strokes }: { strokes: InkStroke[] }) {
  return (
    <svg viewBox="0 0 100 100" className="ink-preview" aria-hidden="true">
      {strokes.map((stroke, index) =>
        stroke.some((point) => point.width !== undefined) ? (
          <path key={index} d={inkOutline(stroke)} fill="#27463f" />
        ) : stroke.length === 1 ? (
          <circle key={index} cx={stroke[0].x} cy={stroke[0].y} r=".75" />
        ) : (
          <polyline key={index} points={stroke.map((point) => `${point.x},${point.y}`).join(" ")} />
        ),
      )}
    </svg>
  );
}

export function Logo() {
  return (
    <span className="logo-mark" aria-hidden="true">
      <span>ㄅ</span>
      <i />
    </span>
  );
}

export function AppHeader({
  onCourses,
  onBack,
  backLabel,
  materialSelector,
  title,
  backSlotRef,
}: {
  onCourses: () => void;
  onBack?: () => void;
  backLabel?: string;
  materialSelector?: ReactNode;
  title?: string;
  backSlotRef?: (element: HTMLDivElement | null) => void;
}) {
  return (
    <header
      className={`app-header ${onBack ? "has-back" : ""} ${materialSelector ? "has-material-selector" : ""}`}
    >
      <div id="app-header-back-slot" ref={backSlotRef} />
      {title && <h1 className="header-page-title">{title}</h1>}
      {materialSelector}
      {onBack && (
        <button className="header-back" type="button" onClick={onBack}>
          <ArrowLeft size={18} weight="bold" aria-hidden="true" />
          <span>{backLabel}</span>
        </button>
      )}
      <button className="brand-button" type="button" onClick={onCourses} aria-label="前往課程">
        <Logo />
        <span>
          <strong>注音小練習</strong>
          <small>一年級學習站</small>
        </span>
      </button>
      {!onBack && !materialSelector && (
        <div className="header-chip">
          <span className="status-dot" /> 不用登入也能練
        </div>
      )}
    </header>
  );
}

export function BottomNav({
  active,
  onNavigate,
}: {
  active: View;
  onNavigate: (view: View) => void;
}) {
  const items = [
    { id: "courses" as View, Icon: BookOpenText, label: "課程" },
    { id: "symbols" as View, Icon: SquaresFour, label: "注音" },
    { id: "practice" as View, Icon: PencilLine, label: "練習" },
    { id: "more" as View, Icon: Gear, label: "更多" },
  ];

  return (
    <nav className="bottom-nav" aria-label="主要導覽">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={active === item.id ? "active" : ""}
          aria-current={active === item.id ? "page" : undefined}
          onClick={() => onNavigate(item.id)}
        >
          <span className="nav-icon" aria-hidden="true">
            <item.Icon size={22} weight={active === item.id ? "fill" : "regular"} />
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="section-heading">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
  );
}

/** `delayed` stays invisible (and lets touches through) unless the wait is noticeable. */
export function LoadingOverlay({ label, delayed = false }: { label: string; delayed?: boolean }) {
  return (
    <div
      className={`loading-overlay${delayed ? " is-delayed" : ""}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span className="loading-orbit" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span>{label}</span>
    </div>
  );
}

/** A newer version is live: offer it now, or it loads on the next visit to the course list. */
export function UpdateReminder() {
  const { status } = useUpdateStatus();
  return status === "available" ? (
    <ShowMsg message="有新版本。回到課程列表時會自動更新，也可以現在更新。">
      <button type="button" onClick={loadLatestVersion}>
        現在更新
      </button>
    </ShowMsg>
  ) : null;
}

export function ResourceNotice({ failed }: { failed: boolean }) {
  return failed ? (
    <ShowMsg error message="部分圖片或字型尚未載入，仍可繼續練習；請檢查網路後重新整理。" />
  ) : null;
}
