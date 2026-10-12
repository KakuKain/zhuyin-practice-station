import { useState } from "react";
import { ArrowsLeftRight } from "@phosphor-icons/react";
import {
  childAvatars,
  chooseChild,
  useChildProfiles,
  type ChildProfile,
  type ChildProfiles,
} from "../lib/storage/child-profiles";

/** A child without a name yet is shown by position, the way a parent would say it. */
export const childLabel = (child: ChildProfile, profiles: ChildProfiles) =>
  child.name || `孩子 ${profiles.children.indexOf(child) + 1}`;

export function ChildAvatar({ child }: { child: ChildProfile }) {
  return (
    <span className={`child-avatar is-${child.avatar}`} aria-hidden="true">
      {childAvatars[child.avatar]}
    </span>
  );
}

/**
 * 現在是誰在練習？ Full screen at the start of a session when several children share the
 * tablet, or as a sheet from 換人. Choosing reopens the app with that child's own records.
 */
export function ChildPicker({
  onChoose,
  onClose,
}: {
  onChoose: (id: string) => void;
  onClose?: () => void;
}) {
  const profiles = useChildProfiles();
  return (
    <div className={onClose ? "child-picker-backdrop" : "child-picker-page"}>
      <section
        className="child-picker"
        role={onClose ? "dialog" : undefined}
        aria-modal={onClose ? true : undefined}
        aria-labelledby="child-picker-title"
      >
        {!onClose && (
          <img
            className="child-picker-art"
            src="course-art/swan-riding-family-watercolor.webp"
            alt=""
          />
        )}
        <h1 id="child-picker-title">現在是誰在練習？</h1>
        <div className="child-picker-list">
          {profiles.children.map((child) => (
            <button
              type="button"
              key={child.id}
              className={child.id === profiles.activeId ? "is-current" : undefined}
              onClick={() => onChoose(child.id)}
            >
              <ChildAvatar child={child} />
              <strong>{childLabel(child, profiles)}</strong>
            </button>
          ))}
        </div>
        {onClose && (
          <button type="button" className="child-picker-cancel" onClick={onClose}>
            取消
          </button>
        )}
      </section>
    </div>
  );
}

/** On the course list: who is practising, and 換人 to hand the tablet to someone else. */
export function ChildGreeting() {
  const profiles = useChildProfiles();
  const [choosing, setChoosing] = useState(false);
  const child = profiles.children.find((item) => item.id === profiles.activeId);
  if (profiles.children.length < 2 || !child) return null;
  return (
    <div className="child-greeting">
      <ChildAvatar child={child} />
      <p>
        <strong>{childLabel(child, profiles)}</strong>，今天想練哪一課？
      </p>
      <button type="button" onClick={() => setChoosing(true)}>
        <ArrowsLeftRight size={18} weight="bold" aria-hidden="true" />
        換人
      </button>
      {choosing && (
        <ChildPicker
          onChoose={(id) => {
            setChoosing(false);
            chooseChild(id);
          }}
          onClose={() => setChoosing(false)}
        />
      )}
    </div>
  );
}
