# Gemini readings

Generated in Google AI Studio on 2026-10-06 with `gemini-3.8-flash-tts`, voice Fola.

The first lesson was approved in conversation before producing lessons 2–9. Inputs follow the lesson text in `features/courses/course-data.ts`, with punctuation added for pauses. Style asks for clear Taiwanese Mandarin, a relaxed pace, complete endings, a pause after the title and between lines, and no added explanations. Pronunciation instructions include first-tone 教 in 教我, first-tone 背 in 背著書包, and ㄨㄢˇ for 浣熊.

Combined rhymes were generated in one 22-item recording using the homophones in `combined-rhyme-examples.json`. Instructions request only each complete syllable, approximately one second of voicing, two seconds of silence between items, first tone except second-tone ㄧㄞ, and no definitions, radicals, stroke counts or introductions.

Splitting used 10 ms RMS windows at threshold 0.008, merged active spans separated by less than 650 ms, and required exactly 22 resulting spans. Each clip retains 300 ms of padding on both sides (limited by source boundaries). Actual voiced spans were 0.86–1.12 seconds. This measures timing and segment count; it does not certify pronunciation.

All files use AAC at 64 kbps and their original pitch and playback speed. Original WAV files remain outside the site in `/Users/kaoru/Desktop/AppDev/kid/material-management-2026-10-02`. The shipped manifest records clip paths, durations, source ranges and lesson source hashes. Runtime uses static audio and needs no Gemini API key.

## Words

Single words can be re-voiced with `scripts/generate-gemini-words.ts`, through the Gemini API (`GEMINI_API_KEY`) or from `<word>.wav` files saved from AI Studio (`--from`; `--prompts` prints what to paste). The prompt asks for clear Taiwanese Mandarin, a relaxed pace, one reading only and no added words, and states the zhuyin and each syllable's tone, taken from the course data (the word must have a single reading). The clip is trimmed with the rhyme rule above and rejected if its voiced length suggests the instructions were read aloud. Clips go to `public/listening-audio/gemini/words/`, the old Meijia clip is removed, the prompt and timing are recorded under `words` in the manifest, and originals stay in the git-ignored `outputs/gemini-words/`. Timing checks do not certify pronunciation; listen before shipping.

## Batches

In October 2026 the macOS Meijia clips were replaced, because the macOS voice license allows personal, non-commercial use only. `scripts/generate-gemini-batch.ts` voices many clips per request, since the free quota allowed about 10–15 requests a day. It went from the most heard: the math instructions, then each lesson's 生字 and circled words, then the numbered math questions, then the other characters of the lesson texts.

- One request reads up to 24 words, or up to 80 syllables of math sentences, each on its own line with `[long pause]` between. The director's notes ask for each line in its own complete intonation rather than a list's, two seconds between lines, and name the reading of each polyphone. The hints cover characters read other than the font's usual way, any polyphone read on its own, and the math polyphones 數長薄曲蔔了哪和地. Where one character has two readings in a batch, the hint names the words around it.
- The batch is cut at its `count − 1` longest pauses (10 ms RMS windows over 0.008, 300 ms padding as above). It is rejected when those pauses are under 0.5 s, or not 1.3 times longer than every pause inside an item. It is also rejected when an item's voiced length is implausible: words from 0.18 s (0.1 s for a lone neutral tone) to 0.9 s per syllable + 0.6 s; sentences from 0.15 to 0.45 s per syllable + 1.5 s.
- Of 55 requests, 6 were rejected:
  - an extra word between two sentences;
  - the seven near-identical sums 二加六–三加四, twice: once with extra speech (81 s), once with one sum skipped. Long sentences now go five at a time.
  - a 69 s take of sums with 0, with extra speech;
  - two word batches with 「得」 or 「著」 too short. 「得」 alone was most likely read ˙ㄉㄜ. The rest of both batches was kept with `--reuse … --skip`, and lone polyphones now always get a hint.
- Kept batches are logged with their full prompt in `assets/gemini-batches.json`; each clip's manifest entry names its batch. Raw takes stay in the git-ignored `outputs/gemini-batch/`. The parent approved the first two batches by ear before the rest were voiced. Words with polyphones or neutral tones were set aside for a listen in `outputs/Gemini批次試聽/破音字抽查`.
