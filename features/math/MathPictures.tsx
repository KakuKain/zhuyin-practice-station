import { Fragment } from "react";
import {
  Acorn,
  Balloon,
  Bird,
  Butterfly,
  Car,
  Carrot,
  Check,
  Fish,
  FlowerTulip,
  HandGrabbing,
  Heart,
  IceCream,
  Leaf,
  Star,
  type Icon,
} from "@phosphor-icons/react";
import { MathWords } from "./MathChrome";
import type { CountIcon, JoinIcon } from "./math-round";

export const icons: Record<CountIcon, { icon: Icon; color: string; name: string }> = {
  fish: { icon: Fish, color: "#2f8fd8", name: "魚" },
  bird: { icon: Bird, color: "#e58a2c", name: "小鳥" },
  tulip: { icon: FlowerTulip, color: "#e0567a", name: "花" },
  star: { icon: Star, color: "#e8b21f", name: "星星" },
  heart: { icon: Heart, color: "#e24b5a", name: "愛心" },
  car: { icon: Car, color: "#3d7bd9", name: "汽車" },
  iceCream: { icon: IceCream, color: "#c86bd6", name: "冰淇淋" },
  carrot: { icon: Carrot, color: "#ef7d1f", name: "紅蘿蔔" },
  balloon: { icon: Balloon, color: "#e0485d", name: "氣球" },
  butterfly: { icon: Butterfly, color: "#7b62d6", name: "蝴蝶" },
  acorn: { icon: Acorn, color: "#a0672d", name: "橡實" },
  leaf: { icon: Leaf, color: "#3f9b4f", name: "葉子" },
};

/** A picture a child can tap to mark as counted, so nothing is counted twice. */
function Markable({
  picture: Picture,
  color,
  label,
  marked,
  onToggle,
}: {
  picture: Icon;
  color: string;
  label: string;
  marked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={marked ? "is-marked" : undefined}
      aria-label={label}
      aria-pressed={marked}
      onClick={onToggle}
    >
      <Picture size={44} weight="fill" color={color} aria-hidden="true" />
      {marked && (
        <span className="math-picture-mark" aria-hidden="true">
          <Check size={16} weight="bold" />
        </span>
      )}
    </button>
  );
}

/** Pictures in rows of five, the way a child lines things up to count them. */
export function CountPictures({
  question,
  marked,
  onToggle,
  small = false,
}: {
  question: { target: number; icon: CountIcon };
  marked?: ReadonlySet<number>;
  onToggle?: (index: number) => void;
  small?: boolean;
}) {
  const { icon: Picture, color, name } = icons[question.icon];
  // 認識 0: the place the pictures would be, with nothing in it. The prompt names what to count
  // (「這裡有幾隻小鳥？」); a basket was counted as one thing.
  if (question.target === 0)
    return (
      <div
        className={`math-pictures is-empty${small ? " is-small" : ""}`}
        role="img"
        aria-label={`這裡沒有${name}`}
      />
    );
  return (
    <div
      className={`math-pictures${small ? " is-small" : ""}`}
      role={onToggle ? "group" : "img"}
      aria-label={onToggle ? `${name}，點一下做記號` : `${question.target} 個${name}`}
    >
      {Array.from({ length: question.target }, (_, index) =>
        onToggle ? (
          <Markable
            key={index}
            picture={Picture}
            color={color}
            label={`第 ${index + 1} 個${name}`}
            marked={marked?.has(index) ?? false}
            onToggle={() => onToggle(index)}
          />
        ) : (
          <span key={index}>
            <Picture size={22} weight="fill" color={color} aria-hidden="true" />
          </span>
        ),
      )}
    </div>
  );
}

/** 合在一起: the two groups side by side, joined by ＋. Marks are numbered across both groups. */
export function JoinPictures({
  question,
  marked,
  onToggle,
  small = false,
}: {
  question: { parts: readonly [number, number]; icon: JoinIcon };
  marked?: ReadonlySet<number>;
  onToggle?: (index: number) => void;
  small?: boolean;
}) {
  const { icon: Picture, color, name } = icons[question.icon];
  const [left, right] = question.parts;
  return (
    <div
      className={`math-join-pictures${small ? " is-small" : ""}`}
      role={onToggle ? "group" : "img"}
      aria-label={
        onToggle
          ? `左邊 ${left} 個${name}，右邊 ${right} 個${name}，點一下做記號`
          : `${left} 個${name}和 ${right} 個${name}`
      }
    >
      {question.parts.map((count, side) => (
        <Fragment key={side}>
          {side === 1 && (
            <span className="math-sign" aria-hidden="true">
              ＋
            </span>
          )}
          <div className="math-join-group">
            {Array.from({ length: count }, (_, position) => {
              const index = side * left + position;
              return onToggle ? (
                <Markable
                  key={position}
                  picture={Picture}
                  color={color}
                  label={`${side ? "右邊" : "左邊"}第 ${position + 1} 個${name}`}
                  marked={marked?.has(index) ?? false}
                  onToggle={() => onToggle(index)}
                />
              ) : (
                <span key={position}>
                  <Picture size={20} weight="fill" color={color} aria-hidden="true" />
                </span>
              );
            })}
          </div>
        </Fragment>
      ))}
    </div>
  );
}

/**
 * 拿走了 (分一分 as a story): all the pictures first; then the ones taken away move into the
 * hand's tray, so the total splits into what was taken and what is left, the 分合圖's two parts.
 */
export function TakePictures({
  question,
  marked,
  onToggle,
  small = false,
}: {
  question: { target: number; parts: readonly [number, number]; icon: CountIcon };
  marked?: ReadonlySet<number>;
  onToggle?: (index: number) => void;
  small?: boolean;
}) {
  const { icon: Picture, color, name } = icons[question.icon];
  const [taken, left] = question.parts;
  const size = small ? 20 : 44;
  return (
    <div
      className={`math-take${small ? " is-small" : ""}`}
      role={onToggle ? "group" : "img"}
      aria-label={`${question.target} 個${name}，拿走了 ${taken} 個${onToggle ? "，點一下做記號" : ""}`}
    >
      <div className="math-take-left">
        {Array.from({ length: small ? left : question.target }, (_, index) =>
          index >= left ? (
            // Where a taken picture was: it fades away as its copy reaches the tray.
            <span key={index} className="math-take-gone" aria-hidden="true">
              <Picture size={size} weight="fill" color={color} />
            </span>
          ) : onToggle ? (
            <Markable
              key={index}
              picture={Picture}
              color={color}
              label={`第 ${index + 1} 個${name}`}
              marked={marked?.has(index) ?? false}
              onToggle={() => onToggle(index)}
            />
          ) : (
            <span key={index}>
              <Picture size={size} weight="fill" color={color} aria-hidden="true" />
            </span>
          ),
        )}
      </div>
      <div className="math-take-tray" aria-hidden="true">
        <span className="math-take-label">
          <HandGrabbing size={small ? 16 : 28} weight="duotone" />
          {!small && <MathWords text="拿走了" />}
        </span>
        <div className="math-take-taken">
          {Array.from({ length: taken }, (_, index) => (
            <span key={index}>
              <Picture size={size} weight="fill" color={color} />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
