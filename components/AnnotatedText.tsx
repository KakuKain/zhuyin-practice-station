import { withPronunciationVariants } from "../features/lesson/annotated-text";

/** Keep variation selectors out of accessible names while the font supplies side annotations. */
export function AnnotatedText({
  text,
  variants,
}: {
  text: string;
  variants?: Readonly<Record<number, string>>;
}) {
  return (
    <span className="annotated-text">
      <span aria-hidden="true">{withPronunciationVariants(text, variants)}</span>
      <span className="visually-hidden">{text}</span>
    </span>
  );
}
