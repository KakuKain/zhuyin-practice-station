import { useId, type ReactNode } from "react";
import {
  pictures,
  type Flat,
  type Picture,
  type PicturePart,
  type Solid,
  type Thing,
} from "./shape-round";

/**
 * 第五課's pictures, drawn in code: soft colours with brown outlines, like the watercolor
 * children's line art. Solids are seen from a little above and to the left, so a box shows its
 * front, top and side and a can its top.
 */
const ink = "#6d4a2f";
/** Flat shapes and 造型 parts take these by index. */
export const shapeColors = ["#f2a39b", "#8ec2ea", "#9dd39a", "#f6d27c", "#b8a2e3", "#f1b27a"];
/** The face a child traces, shown in coral with a dashed edge. */
const traced = { fill: "rgba(240, 110, 80, 0.8)", stroke: "#d6452f" };

type Point = [number, number];
const polygon = (points: Point[]) => points.map(([x, y]) => `${x},${y}`).join(" ");

/** A box seen from above-left: the front face, then its depth up and to the right. */
function box(x: number, y: number, w: number, h: number, depth: number) {
  const [dx, dy] = [depth * 0.55, -depth * 0.45];
  return {
    front: [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ] as Point[],
    top: [
      [x, y],
      [x + dx, y + dy],
      [x + w + dx, y + dy],
      [x + w, y],
    ] as Point[],
    side: [
      [x + w, y],
      [x + w + dx, y + dy],
      [x + w + dx, y + h + dy],
      [x + w, y + h],
    ] as Point[],
    /** A point on the top face: u across, v back. */
    onTop: (u: number, v: number): Point => [x + u * w + v * dx, y + v * dy],
    /** A point on the side face: u back, v down. */
    onSide: (u: number, v: number): Point => [x + w + u * dx, y + u * dy + v * h],
  };
}

function Box({
  x,
  y,
  w,
  h,
  depth,
  colors,
  trace,
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  depth: number;
  colors: [string, string, string];
  trace?: boolean;
  children?: ReactNode;
}) {
  const faces = box(x, y, w, h, depth);
  return (
    <g stroke={ink} strokeWidth={2.5} strokeLinejoin="round">
      <polygon points={polygon(faces.side)} fill={colors[2]} />
      <polygon points={polygon(faces.top)} fill={colors[1]} />
      <polygon points={polygon(faces.front)} fill={colors[0]} />
      {children}
      {trace && (
        <polygon
          points={polygon(faces.front)}
          fill={traced.fill}
          stroke={traced.stroke}
          strokeWidth={3}
          strokeDasharray="6 4"
        />
      )}
    </g>
  );
}

function Can({
  cx,
  top,
  bottom,
  rx,
  ry,
  body,
  lid,
  trace,
  children,
}: {
  cx: number;
  top: number;
  bottom: number;
  rx: number;
  ry: number;
  body: string;
  lid: string;
  trace?: boolean;
  children?: ReactNode;
}) {
  const shade = useId();
  return (
    <g stroke={ink} strokeWidth={2.5} strokeLinejoin="round">
      <defs>
        <linearGradient id={shade} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <path
        d={`M${cx - rx},${top} L${cx - rx},${bottom} A${rx},${ry} 0 0 0 ${cx + rx},${bottom} L${cx + rx},${top} Z`}
        fill={body}
      />
      {children}
      <path
        d={`M${cx - rx},${top} L${cx - rx},${bottom} A${rx},${ry} 0 0 0 ${cx + rx},${bottom} L${cx + rx},${top} Z`}
        fill={`url(#${shade})`}
        stroke="none"
      />
      <ellipse cx={cx} cy={top} rx={rx} ry={ry} fill={lid} />
      {trace && (
        <ellipse
          cx={cx}
          cy={top}
          rx={rx}
          ry={ry}
          fill={traced.fill}
          stroke={traced.stroke}
          strokeWidth={3}
          strokeDasharray="6 4"
        />
      )}
    </g>
  );
}

function Ball({
  cx,
  cy,
  r,
  fill,
  children,
}: {
  cx: number;
  cy: number;
  r: number;
  fill: string;
  children?: ReactNode;
}) {
  const light = useId();
  return (
    <g>
      <defs>
        <radialGradient id={light} cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.14" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke={ink} strokeWidth={2.5} />
      {children}
      <circle cx={cx} cy={cy} r={r} fill={`url(#${light})`} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={ink} strokeWidth={2.5} />
    </g>
  );
}

const Frame = ({ label, children }: { label?: string; children: ReactNode }) => (
  <svg
    viewBox="0 0 120 120"
    role={label ? "img" : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : true}
  >
    {children}
  </svg>
);

/** The three kinds on the answer cards: a cardboard box, a can and a ball. */
export function SolidArt({ solid }: { solid: Solid }) {
  return (
    <Frame>
      {solid === "box" ? (
        <Box x={20} y={46} w={56} h={50} depth={40} colors={["#e8b77f", "#f2cf9f", "#d29d62"]} />
      ) : solid === "can" ? (
        <Can cx={58} top={30} bottom={96} rx={30} ry={10} body="#8ec2ea" lid="#cfe6f7" />
      ) : (
        <Ball cx={60} cy={64} r={40} fill="#f2a39b" />
      )}
    </Frame>
  );
}

/** Dots of a die face, at fractions of the face. */
const dicePips: Record<number, Point[]> = {
  2: [
    [0.28, 0.3],
    [0.72, 0.7],
  ],
  3: [
    [0.25, 0.25],
    [0.5, 0.5],
    [0.75, 0.75],
  ],
};

/** Things from home. With `trace`, the face a child would trace is coloured. */
export function ThingArt({
  thing,
  trace = false,
  label,
}: {
  thing: Thing;
  trace?: boolean;
  label?: string;
}) {
  switch (thing) {
    case "tissue": {
      const faces = box(14, 60, 74, 36, 40);
      const [ox, oy] = faces.onTop(0.5, 0.5);
      return (
        <Frame label={label}>
          <Box
            x={14}
            y={60}
            w={74}
            h={36}
            depth={40}
            colors={["#9ccfe8", "#c3e3f2", "#7fb6d3"]}
            trace={trace}
          >
            {[0.2, 0.5, 0.8].map((u) => (
              <circle
                key={u}
                cx={14 + u * 74}
                cy={78}
                r={4}
                fill="#fff"
                stroke="none"
                opacity={0.8}
              />
            ))}
            <ellipse cx={ox} cy={oy} rx={16} ry={4.5} fill="#5d7f93" />
            <path
              d={`M${ox - 12},${oy} C${ox - 16},${oy - 18} ${ox - 2},${oy - 16} ${ox - 4},${oy - 30} C${ox + 6},${oy - 22} ${ox + 14},${oy - 20} ${ox + 10},${oy} Z`}
              fill="#fff"
            />
          </Box>
        </Frame>
      );
    }
    case "gift": {
      const faces = box(22, 48, 52, 52, 40);
      const [bx, by] = faces.onTop(0.5, 0.5);
      return (
        <Frame label={label}>
          <Box
            x={22}
            y={48}
            w={52}
            h={52}
            depth={40}
            colors={["#b8a2e3", "#d3c5f0", "#9a83c9"]}
            trace={trace}
          >
            <rect x={44} y={48} width={8} height={52} fill="#f6d27c" />
            <polygon
              points={polygon([
                faces.onTop(0.42, 0),
                faces.onTop(0.42, 1),
                faces.onTop(0.58, 1),
                faces.onTop(0.58, 0),
              ])}
              fill="#f6d27c"
            />
            <ellipse
              cx={bx - 9}
              cy={by - 6}
              rx={10}
              ry={6}
              fill="#f6d27c"
              transform={`rotate(-25 ${bx - 9} ${by - 6})`}
            />
            <ellipse
              cx={bx + 9}
              cy={by - 6}
              rx={10}
              ry={6}
              fill="#f6d27c"
              transform={`rotate(25 ${bx + 9} ${by - 6})`}
            />
          </Box>
        </Frame>
      );
    }
    case "dice": {
      const faces = box(24, 50, 50, 50, 38);
      return (
        <Frame label={label}>
          <Box
            x={24}
            y={50}
            w={50}
            h={50}
            depth={38}
            colors={["#fffaf0", "#fff", "#e8e0d0"]}
            trace={trace}
          >
            <circle cx={49} cy={75} r={7} fill="#d6452f" stroke="none" />
            {dicePips[2].map(([u, v]) => {
              const [px, py] = faces.onTop(u, v);
              return (
                <ellipse key={`t${u}`} cx={px} cy={py} rx={4.5} ry={2.4} fill={ink} stroke="none" />
              );
            })}
            {dicePips[3].map(([u, v]) => {
              const [px, py] = faces.onSide(u, v);
              return (
                <ellipse key={`s${u}`} cx={px} cy={py} rx={2.6} ry={4.2} fill={ink} stroke="none" />
              );
            })}
          </Box>
        </Frame>
      );
    }
    case "tin":
      return (
        <Frame label={label}>
          <Can
            cx={58}
            top={28}
            bottom={98}
            rx={28}
            ry={9}
            body="#d7dee5"
            lid="#e9eef2"
            trace={trace}
          >
            <path d="M30,46 L30,84 A28,9 0 0 0 86,84 L86,46 A28,9 0 0 1 30,46 Z" fill="#e2675a" />
            <circle cx={58} cy={68} r={9} fill="#fff" />
          </Can>
          {!trace && (
            <ellipse cx={58} cy={28} rx={20} ry={6} fill="none" stroke={ink} strokeWidth={1.5} />
          )}
        </Frame>
      );
    case "drum":
      return (
        <Frame label={label}>
          <Can
            cx={60}
            top={44}
            bottom={96}
            rx={38}
            ry={12}
            body="#8fcf8c"
            lid="#fff4e2"
            trace={trace}
          >
            <path
              d="M24,52 L36,90 L48,54 L60,92 L72,54 L84,90 L96,52"
              fill="none"
              stroke="#f6d27c"
              strokeWidth={3}
            />
          </Can>
        </Frame>
      );
    case "cookie":
      return (
        <Frame label={label}>
          <Can
            cx={60}
            top={54}
            bottom={94}
            rx={42}
            ry={13}
            body="#8ec2ea"
            lid="#b9dcf4"
            trace={trace}
          >
            {[30, 50, 70, 90].map((cx, index) => (
              <circle key={cx} cx={cx} cy={index % 2 ? 72 : 80} r={4} fill="#fff" stroke="none" />
            ))}
          </Can>
        </Frame>
      );
    case "beachball":
      return (
        <Frame label={label}>
          <Ball cx={60} cy={62} r={40} fill="#e2675a">
            <ellipse cx={60} cy={62} rx={26} ry={40} fill="#f6d27c" />
            <ellipse cx={60} cy={62} rx={11} ry={40} fill="#8ec2ea" />
            <circle cx={60} cy={24} r={5} fill="#fff" stroke={ink} strokeWidth={1.5} />
          </Ball>
        </Frame>
      );
    case "orange":
      return (
        <Frame label={label}>
          <Ball cx={60} cy={66} r={38} fill="#f39a3d">
            {[
              [44, 58],
              [70, 52],
              [56, 80],
              [78, 74],
              [40, 82],
            ].map(([x, y]) => (
              <circle key={`${x}`} cx={x} cy={y} r={1.6} fill="#c9661a" />
            ))}
          </Ball>
          <path d="M60,30 C58,22 60,18 62,14" fill="none" stroke={ink} strokeWidth={3} />
          <path
            d="M62,22 C72,12 86,16 88,22 C78,28 68,28 62,22 Z"
            fill="#7cc06d"
            stroke={ink}
            strokeWidth={2}
          />
        </Frame>
      );
    case "basketball":
      return (
        <Frame label={label}>
          <Ball cx={60} cy={62} r={40} fill="#e8873a">
            <g fill="none" stroke="#4a2e1a" strokeWidth={2.5}>
              <line x1={60} y1={22} x2={60} y2={102} />
              <line x1={20} y1={62} x2={100} y2={62} />
              <path d="M32,34 C46,48 46,76 32,90" />
              <path d="M88,34 C74,48 74,76 88,90" />
            </g>
          </Ball>
        </Frame>
      );
  }
}

/** A flat shape on its own, as drawn among others: sizes and orientations vary by `variant`. */
export function FlatArt({
  flat,
  variant = 0,
  color = 0,
}: {
  flat: Flat;
  variant?: number;
  color?: number;
}) {
  const fill = shapeColors[color % shapeColors.length];
  const common = { fill, stroke: ink, strokeWidth: 3, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      {flat === "square" ? (
        variant === 0 ? (
          <rect x={20} y={20} width={60} height={60} {...common} />
        ) : (
          <rect x={30} y={30} width={40} height={40} {...common} />
        )
      ) : flat === "rect" ? (
        variant === 0 ? (
          <rect x={10} y={32} width={80} height={36} {...common} />
        ) : (
          <rect x={32} y={10} width={36} height={80} {...common} />
        )
      ) : flat === "triangle" ? (
        <polygon
          points={
            variant === 0
              ? "50,14 88,82 12,82"
              : variant === 1
                ? "18,16 18,84 84,84"
                : "12,20 88,20 50,86"
          }
          {...common}
        />
      ) : (
        <circle cx={50} cy={50} r={variant === 0 ? 36 : 24} {...common} />
      )}
    </svg>
  );
}

function PicturePartArt({ part }: { part: PicturePart }) {
  const common = {
    fill: shapeColors[part.color % shapeColors.length],
    stroke: ink,
    strokeWidth: 1.6,
    strokeLinejoin: "round" as const,
  };
  switch (part.flat) {
    case "square":
    case "rect":
      return <rect x={part.x} y={part.y} width={part.w} height={part.h} {...common} />;
    case "circle":
      return <circle cx={part.cx} cy={part.cy} r={part.r} {...common} />;
    case "triangle":
      return <polygon points={polygon(part.points.map(([x, y]) => [x, y]))} {...common} />;
  }
}

/** A 做造型 picture, its shapes drawn in order. */
export function PictureArt({ picture, label }: { picture: Picture; label?: string }) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={label ?? pictures[picture].name}>
      {(pictures[picture].parts as readonly PicturePart[]).map((part, index) => (
        <PicturePartArt key={index} part={part} />
      ))}
    </svg>
  );
}
