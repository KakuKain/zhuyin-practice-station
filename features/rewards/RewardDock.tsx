import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { AnnotatedText } from "../../components/AnnotatedText";
import { storageKeys } from "../../lib/storage/storage-keys";
import { Say, StampCardDialog } from "./StampCard";
import { TasksDialog } from "./TodayTasks";
import {
  visibleTasks,
  type CardProgress,
  type DailyTask,
  type RewardSettings,
  type StampBook,
} from "./stamp-book";

/** Where the button rests: against the left or right edge, and how far down the free space. */
type Place = { side: "left" | "right"; y: number };
const defaultPlace: Place = { side: "right", y: 1 };
const size = 72;
/** A move this far is a drag; anything less is a tap that opens the menu. */
const dragDistance = 8;

function readPlace(): Place {
  try {
    const raw = JSON.parse(
      window.localStorage.getItem(storageKeys.rewardDock) ?? "null",
    ) as Partial<Place> | null;
    if (raw && (raw.side === "left" || raw.side === "right") && Number.isFinite(raw.y))
      return { side: raw.side, y: Math.min(1, Math.max(0, raw.y!)) };
  } catch {
    // An unreadable place falls back to the corner.
  }
  return defaultPlace;
}

/** The space the button may use: below the header, above the bottom navigation. */
function freeSpace() {
  const nav =
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-height")) || 78;
  const top = 76;
  const bottom = Math.max(top, window.innerHeight - nav - 16 - size);
  // On a wide screen the button keeps near the lessons rather than the far edge.
  const inset = Math.max(14, (window.innerWidth - 900) / 2);
  return { top, bottom, left: inset, right: window.innerWidth - inset - size };
}

const toPixels = (place: Place) => {
  const space = freeSpace();
  return {
    left: place.side === "left" ? space.left : space.right,
    top: space.top + place.y * (space.bottom - space.top),
  };
};

/**
 * On the course list, one floating watercolor button that takes no room from the lessons. It
 * opens a small menu, 今天的任務 and 集章卡, and each opens its own sheet. A coral dot shows a
 * task is waiting or the card is full. It can be dragged anywhere; let go, it settles against the
 * nearer side and stays there on this device.
 */
export function RewardDock({
  name,
  progress,
  book,
  settings,
  onChoose,
  onOpenCard,
  onGo,
}: {
  name?: string;
  progress: CardProgress;
  book: StampBook;
  settings: RewardSettings;
  onChoose: (reward: string) => void;
  /** The card shows what a stamp toast was saying, so the toast can go. */
  onOpenCard: () => void;
  onGo: (task: DailyTask) => void;
}) {
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState<"card" | "tasks" | null>(null);
  const dock = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState(readPlace);
  const [dragAt, setDragAt] = useState<{ left: number; top: number } | null>(null);
  const drag = useRef<{
    pointer: number;
    x: number;
    y: number;
    left: number;
    top: number;
    moved: boolean;
    at: { left: number; top: number };
  } | null>(null);
  const skipClick = useRef(false);
  const [, setViewport] = useState(0);

  // A rotation or a resized window moves the resting place with it.
  useEffect(() => {
    const resize = () => setViewport((count) => count + 1);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const tasks = visibleTasks(book);
  const waiting = tasks.some((task) => task.doneAt === undefined);
  const news = waiting || progress.full;

  // A tap anywhere else closes the menu.
  useEffect(() => {
    if (!menu) return;
    const close = (event: PointerEvent) => {
      if (!dock.current?.contains(event.target as Node)) setMenu(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [menu]);

  const begin = (event: ReactPointerEvent<HTMLButtonElement>) => {
    skipClick.current = false;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const box = event.currentTarget.getBoundingClientRect();
    drag.current = {
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: box.left,
      top: box.top,
      moved: false,
      at: { left: box.left, top: box.top },
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Without capture the button still follows while the pointer stays over it.
    }
  };
  /** Follows the pointer once it has moved far enough to be a drag. */
  const follow = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return null;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (!current.moved && Math.hypot(dx, dy) < dragDistance) return current;
    if (!current.moved) setMenu(false);
    current.moved = true;
    const space = freeSpace();
    current.at = {
      left: Math.min(Math.max(current.left + dx, 4), window.innerWidth - size - 4),
      top: Math.min(Math.max(current.top + dy, space.top), space.bottom),
    };
    setDragAt(current.at);
    return current;
  };
  const end = (event: ReactPointerEvent<HTMLButtonElement>) => {
    // Where the pointer lifted counts, even if no move was reported on the way there.
    const current = event.type === "pointerup" ? follow(event) : drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    drag.current = null;
    if (!current.moved) return;
    skipClick.current = true;
    const space = freeSpace();
    const next: Place = {
      side: current.at.left + size / 2 < window.innerWidth / 2 ? "left" : "right",
      y: (current.at.top - space.top) / Math.max(1, space.bottom - space.top),
    };
    setPlace(next);
    setDragAt(null);
    try {
      window.localStorage.setItem(storageKeys.rewardDock, JSON.stringify(next));
    } catch {
      // The button still rests here until the page reloads.
    }
  };

  const choose = (sheet: "card" | "tasks") => {
    setMenu(false);
    if (sheet === "card") onOpenCard();
    setOpen(sheet);
  };

  return (
    <>
      <div
        className={`reward-dock is-${place.side}${place.y < 0.5 ? " is-menu-below" : ""}${dragAt ? " is-dragging" : ""}`}
        ref={dock}
        style={(dragAt ?? toPixels(place)) as CSSProperties}
      >
        {menu && (
          <div className="reward-menu" role="menu" aria-label="任務和集章卡">
            {tasks.length > 0 && (
              <button type="button" role="menuitem" onClick={() => choose("tasks")}>
                <img src="course-art/course-flag-grass-v1.webp" alt="" className="is-flag" />
                <AnnotatedText text="今天的任務" />
                {waiting && <i className="reward-dock-dot" aria-label="還有任務" />}
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              className={progress.full ? "is-full" : undefined}
              onClick={() => choose("card")}
            >
              <img
                src={
                  progress.full
                    ? "course-art/festival-watercolor.webp"
                    : "course-art/sound-complete-cat.webp"
                }
                alt=""
              />
              <Say word="card" />
              {progress.full && <i className="reward-dock-dot" aria-label="集滿了" />}
            </button>
          </div>
        )}
        <button
          type="button"
          className={`reward-dock-button${progress.full ? " is-full" : ""}`}
          aria-label="任務和集章卡"
          aria-haspopup="menu"
          aria-expanded={menu}
          title="可以拖曳到別的位置"
          onPointerDown={begin}
          onPointerMove={follow}
          onPointerUp={end}
          onPointerCancel={end}
          onClick={() => {
            if (skipClick.current) {
              skipClick.current = false;
              return;
            }
            setMenu((current) => !current);
          }}
        >
          {/* Not draggable as an image: the browser would take over the drag of the button. */}
          <img src="course-art/sound-complete-cat.webp" alt="" draggable={false} />
          {news && <i className="reward-dock-dot" aria-hidden="true" />}
        </button>
      </div>
      {open === "card" && (
        <StampCardDialog
          name={name}
          progress={progress}
          book={book}
          settings={settings}
          onChoose={onChoose}
          onClose={() => setOpen(null)}
        />
      )}
      {open === "tasks" && (
        <TasksDialog
          tasks={tasks}
          onGo={(task) => {
            setOpen(null);
            onGo(task);
          }}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
