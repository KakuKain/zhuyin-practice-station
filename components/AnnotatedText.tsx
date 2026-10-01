import { withPronunciationVariants } from "../features/lesson/annotated-text";

/** Keep variation selectors out of accessible names while the font supplies side annotations. */
export function AnnotatedText({
  text,
  variants,
  groups,
}: {
  text: string;
  variants?: Readonly<Record<number, string>>;
  groups?: readonly string[];
}) {
  return (
    <span className="annotated-text">
      <span aria-hidden="true">
        {groups
          ? groups.map((group, index) => {
              const offset = groups.slice(0, index).join("").length;
              return (
                <span className="title-word" key={index}>
                  {Array.from(group)
                    .map((character, position) => character + (variants?.[offset + position] ?? ""))
                    .join("")}
                </span>
              );
            })
          : withPronunciationVariants(text, variants)}
      </span>
      <span className="visually-hidden">{text}</span>
    </span>
  );
}
