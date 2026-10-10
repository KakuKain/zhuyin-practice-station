export type SoundOption = { label: string; audioText: string; caption?: string };
export type SoundPair = {
  id: string;
  title: string;
  sounds: readonly [SoundOption, SoundOption];
};
const symbol = (label: string): SoundOption => ({ label, audioText: label });

const symbols = (id: string, first: string, second: string): SoundPair => ({
  id,
  title: `${first} / ${second}`,
  sounds: [symbol(first), symbol(second)],
});

export type SoundGroup = { title: string; pairs: readonly SoundPair[] };

/** Pairs children often mix up, grouped so a parent can find one quickly. */
export const soundGroups: readonly SoundGroup[] = [
  {
    title: "捲舌、不捲舌",
    pairs: [
      symbols("zhi-zi", "ㄓ", "ㄗ"),
      symbols("chi-ci", "ㄔ", "ㄘ"),
      symbols("shi-si", "ㄕ", "ㄙ"),
      symbols("ri-le", "ㄖ", "ㄌ"),
    ],
  },
  {
    title: "其他聲母",
    pairs: [
      symbols("zhi-chi", "ㄓ", "ㄔ"),
      symbols("fo-he", "ㄈ", "ㄏ"),
      symbols("ne-le", "ㄋ", "ㄌ"),
    ],
  },
  {
    title: "鼻音韻母",
    pairs: [
      symbols("en-eng", "ㄣ", "ㄥ"),
      symbols("an-ang", "ㄢ", "ㄤ"),
      symbols("ang-eng", "ㄤ", "ㄥ"),
      symbols("in-ing", "ㄧㄣ", "ㄧㄥ"),
      symbols("ian-iang", "ㄧㄢ", "ㄧㄤ"),
      symbols("uen-ueng", "ㄨㄣ", "ㄨㄥ"),
    ],
  },
  {
    title: "其他韻母",
    pairs: [
      symbols("an-ai", "ㄢ", "ㄞ"),
      symbols("o-e", "ㄛ", "ㄜ"),
      symbols("o-ou", "ㄛ", "ㄡ"),
      symbols("i-yu", "ㄧ", "ㄩ"),
    ],
  },
  {
    title: "聲調",
    pairs: [
      {
        id: "tone-2-3",
        title: "二聲 / 三聲",
        sounds: [
          { label: "ㄌㄧˊ", audioText: "狸", caption: "二聲 ˊ" },
          { label: "ㄌㄧˇ", audioText: "裡", caption: "三聲 ˇ" },
        ],
      },
    ],
  },
];

export const soundPairs: readonly SoundPair[] = soundGroups.flatMap((group) => group.pairs);

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
