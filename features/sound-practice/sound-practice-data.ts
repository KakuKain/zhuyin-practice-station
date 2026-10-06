export type SoundOption = { label: string; audioText: string; caption?: string };
export type SoundPair = {
  id: string;
  title: string;
  sounds: readonly [SoundOption, SoundOption];
};
const symbol = (label: string): SoundOption => ({ label, audioText: label });

export const soundPairs: readonly SoundPair[] = [
  { id: "zhi-chi", title: "ㄓ / ㄔ", sounds: [symbol("ㄓ"), symbol("ㄔ")] },
  { id: "zhi-zi", title: "ㄓ / ㄗ", sounds: [symbol("ㄓ"), symbol("ㄗ")] },
  { id: "chi-ci", title: "ㄔ / ㄘ", sounds: [symbol("ㄔ"), symbol("ㄘ")] },
  { id: "an-ai", title: "ㄢ / ㄞ", sounds: [symbol("ㄢ"), symbol("ㄞ")] },
  { id: "an-ang", title: "ㄢ / ㄤ", sounds: [symbol("ㄢ"), symbol("ㄤ")] },
  { id: "ang-eng", title: "ㄤ / ㄥ", sounds: [symbol("ㄤ"), symbol("ㄥ")] },
  {
    id: "tone-2-3",
    title: "二聲 / 三聲",
    sounds: [
      { label: "ㄌㄧˊ", audioText: "狸", caption: "二聲 ˊ" },
      { label: "ㄌㄧˇ", audioText: "裡", caption: "三聲 ˇ" },
    ],
  },
];

export type SoundQuestion = { target: number; order: [number, number] };

/** Equal exposure, shuffled targets and positions, not a predictable alternation. */
export function makeSoundRound(random = Math.random): SoundQuestion[] {
  const targets = [0, 0, 0, 1, 1, 1];
  for (let i = targets.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [targets[i], targets[j]] = [targets[j], targets[i]];
  }
  return targets.map((target) => ({ target, order: random() < 0.5 ? [0, 1] : [1, 0] }));
}
