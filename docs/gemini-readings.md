# Gemini readings

Generated in Google AI Studio on 2026-10-06 with `gemini-3.8-flash-tts`, voice Fola.

The first lesson was approved in conversation before producing lessons 2–9. Inputs follow the lesson text in `features/courses/course-data.ts`, with punctuation added for pauses. Style asks for clear Taiwanese Mandarin, a relaxed pace, complete endings, a pause after the title and between lines, and no added explanations. Pronunciation instructions include first-tone 教 in 教我, first-tone 背 in 背著書包, and ㄨㄢˇ for 浣熊.

Combined rhymes were generated in one 22-item recording using the homophones in `combined-rhyme-examples.json`. Instructions request only each complete syllable, approximately one second of voicing, two seconds of silence between items, first tone except second-tone ㄧㄞ, and no definitions, radicals, stroke counts or introductions.

Splitting used 10 ms RMS windows at threshold 0.008, merged active spans separated by less than 650 ms, and required exactly 22 resulting spans. Each clip retains 300 ms of padding on both sides (limited by source boundaries). Actual voiced spans were 0.86–1.12 seconds. This measures timing and segment count; it does not certify pronunciation.

All files use AAC at 64 kbps and their original pitch and playback speed. Original WAV files remain outside the site in `/Users/kaoru/Desktop/AppDev/kid/material-management-2026-10-02`. The shipped manifest records clip paths, durations, source ranges and lesson source hashes. Runtime uses static audio and needs no Gemini API key.
