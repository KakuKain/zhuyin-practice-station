import type { AppController } from "../usePracticeApp";
import { registeredAudioUrl } from "../../lib/audio/audio-registry";

/** A text to speak, with one syllable per Han character. */
export type Said = { text: string; readings: string };

/** The registered clip of a text in that reading, or null while it is not voiced. */
export const clipOf = ({ text, readings }: Said) => {
  const pronunciation = readings.replaceAll(" ", "|");
  return registeredAudioUrl(text, pronunciation) ? { text, pronunciation } : null;
};

/** Plays the clips that are voiced, one after another; the others are skipped. */
export function useSay(app: Pick<AppController, "speak">) {
  return (parts: Said[]) => {
    const clips = parts.flatMap((part) => clipOf(part) ?? []);
    const play = (i: number) => {
      const clip = clips[i];
      if (!clip) return;
      app.speak(clip.text, {
        pronunciation: clip.pronunciation,
        onEnded: () => play(i + 1),
        onError: () => {},
      });
    };
    play(0);
  };
}
