import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Generates candidates only. Audition each clip before changing the site's playback map.
const root = resolve(import.meta.dirname, "..");
const examples = JSON.parse(
  await readFile(resolve(root, "features/symbols/combined-rhyme-examples.json"), "utf8"),
);
const planOnly = process.argv.includes("--plan");
const region = process.env.AZURE_SPEECH_REGION;
const key = process.env.AZURE_SPEECH_KEY;
const voice = process.env.AZURE_SPEECH_VOICE;
const escape = (value) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c],
  );
const plan = examples.map(({ rhyme, character }) => ({
  rhyme,
  character,
  pronunciation: `${rhyme}ˉ`,
  file: [...rhyme].map((c) => c.codePointAt(0).toString(16)).join("-") + ".mp3",
  reviewStatus: "needs-human-listening",
}));
if (planOnly) {
  console.log(JSON.stringify(plan, null, 2));
} else {
  if (!key || !region || !voice)
    throw new Error(
      "Configure AZURE_SPEECH_KEY, AZURE_SPEECH_REGION and AZURE_SPEECH_VOICE in the local environment. No files changed.",
    );
  if (!/^[a-z0-9-]+$/.test(region)) throw new Error("Invalid Azure region.");
  const headers = { "Ocp-Apim-Subscription-Key": key };
  const base = `https://${region}.tts.speech.microsoft.com/cognitiveservices`;
  const voicesResponse = await fetch(`${base}/voices/list`, {
    headers,
    signal: AbortSignal.timeout(30000),
  });
  if (!voicesResponse.ok) throw new Error(`Voice lookup failed (${voicesResponse.status}).`);
  const voices = await voicesResponse.json();
  if (!voices.some((item) => item.ShortName === voice && item.Locale === "zh-TW"))
    throw new Error("Select an available zh-TW voice. No files changed.");
  const output = resolve(root, "outputs/azure-rhyme-candidates");
  await mkdir(output, { recursive: true });
  for (const clip of plan) {
    // Force one whole syllable with first tone. Do not synthesize separate symbols.
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-TW"><voice name="${escape(voice)}"><break time="250ms"/><phoneme alphabet="sapi" ph="${escape(clip.pronunciation)}">${escape(clip.character)}</phoneme><break time="750ms"/></voice></speak>`;
    const response = await fetch(`${base}/v1`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "zhuyin-practice-station",
      },
      body: ssml,
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok)
      throw new Error(
        `Synthesis failed for ${clip.rhyme} (${response.status}); no playback routes changed.`,
      );
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length < 1000) throw new Error(`Unexpected empty audio for ${clip.rhyme}.`);
    await writeFile(resolve(output, clip.file), bytes);
    console.log(`Candidate generated: ${clip.rhyme}`);
  }
  await writeFile(
    resolve(output, "manifest.json"),
    JSON.stringify({ provider: "Azure", voice, plan }, null, 2),
  );
  console.log("Candidates ready for listening review; production playback has not changed.");
}
