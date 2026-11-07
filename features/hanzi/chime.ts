let context: AudioContext | null = null;

/**
 * A soft sound for each stroke: a high note when it is right, a low one when it is not, and a
 * rising pair when the 生字 is finished. Made on the spot, so there is no file to load.
 */
export function chime(kind: "stroke" | "miss" | "done") {
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
    const notes = kind === "stroke" ? [880] : kind === "miss" ? [220] : [660, 990];
    notes.forEach((frequency, i) => {
      const at = context!.currentTime + i * 0.12;
      const oscillator = context!.createOscillator();
      const gain = context!.createGain();
      oscillator.type = kind === "miss" ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(kind === "miss" ? 0.12 : 0.18, at + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.28);
      oscillator.connect(gain).connect(context!.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.3);
    });
  } catch {
    // No sound where Web Audio is unavailable; the ✗ and the ink still show.
  }
}
