import examples from "./combined-rhyme-examples.json";

// Keep the original MOE recordings intact, including the character attributes.
export const combinedRhymeExamples = examples;

export function combinedRhymeExample(rhyme: string) {
  return combinedRhymeExamples.find((example) => example.rhyme === rhyme);
}
