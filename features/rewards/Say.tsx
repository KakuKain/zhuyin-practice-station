import { AnnotatedText } from "../../components/AnnotatedText";
import { readingVariants } from "../lesson/reading-variants";
import { fillWord, stampWords, type StampWord } from "./stamp-words";

/** A sentence for the child, in 國字注音. Kept apart so the course list's dock loads it alone. */
export function Say({ word, n, m }: { word: StampWord; n?: number; m?: number }) {
  const text = fillWord(word, n, m);
  return <AnnotatedText text={text} variants={readingVariants(text, stampWords[word][1])} />;
}
