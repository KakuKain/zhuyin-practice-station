"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Headphones, SpeakerHigh } from "@phosphor-icons/react";
import { SectionHeading } from "../../components/AppChrome";
import { ZhuyinStack } from "../../components/Zhuyin";
import type { AppController } from "../usePracticeApp";
import {
  makeSoundRound,
  soundPairs,
  type SoundPair,
  type SoundQuestion,
} from "./sound-practice-data";

type Audio = Pick<AppController, "speak" | "stopPlayback" | "audioLoading" | "audioError">;
export function SoundPractice({ audio, onBack }: { audio: Audio; onBack: () => void }) {
  const [pair, setPair] = useState<SoundPair | null>(null);
  const [heard, setHeard] = useState<number[]>([]);
  const [round, setRound] = useState<SoundQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [canChoose, setCanChoose] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "retry" | null>(null);
  const [firstTry, setFirstTry] = useState<boolean[]>([]);
  const [hadWrong, setHadWrong] = useState(false);
  const [playing, setPlaying] = useState(false);
  const generation = useRef(0);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => () => audio.stopPlayback(), [audio.stopPlayback]);
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, [pair, round.length, index]);
  const cancel = () => {
    generation.current += 1;
    audio.stopPlayback();
    setPlaying(false);
  };
  const compare = (choice: number) => {
    if (!pair) return;
    cancel();
    const token = generation.current;
    setPlaying(true);
    audio.speak(pair.sounds[choice].audioText, {
      playbackRate: 1,
      allowSynthesis: false,
      onEnded: () => {
        if (token !== generation.current) return;
        setPlaying(false);
        setHeard((current) => (current.includes(choice) ? current : [...current, choice]));
      },
    });
  };
  const playQuestion = (questions = round, questionIndex = index) => {
    if (!pair || !questions[questionIndex]) return;
    cancel();
    const token = generation.current;
    setCanChoose(false);
    setPlaying(true);
    audio.speak(pair.sounds[questions[questionIndex].target].audioText, {
      playbackRate: 1,
      allowSynthesis: false,
      onEnded: () => {
        if (token !== generation.current) return;
        setPlaying(false);
        setCanChoose(true);
      },
    });
  };
  const reset = () => {
    cancel();
    setPair(null);
    setHeard([]);
    setRound([]);
    setIndex(0);
    setFeedback(null);
    setFirstTry([]);
    setHadWrong(false);
    setCanChoose(false);
  };
  const finished = round.length > 0 && index === round.length;
  const back = () => {
    if (pair) reset();
    else {
      cancel();
      onBack();
    }
  };
  return (
    <section className="page-section sound-practice-page">
      <button type="button" className="sound-back" onClick={back}>
        <ArrowLeft size={18} aria-hidden="true" />
        {pair ? "換一組聲音" : "回到練習紀錄"}
      </button>
      <SectionHeading title="辨音小練習" description="一次分辨兩個音，不用寫字、不計時。" />
      {!pair ? (
        <>
          <h2 ref={titleRef} tabIndex={-1}>
            今天先練哪一組？
          </h2>
          <div className="sound-pair-list">
            {soundPairs.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => {
                  cancel();
                  setPair(item);
                }}
              >
                <span>{item.title}</span>
                <small>{item.optional ? "之後學到再練" : "6 題短練習"}</small>
              </button>
            ))}
          </div>
        </>
      ) : finished ? (
        <div className="sound-practice-card sound-finished">
          <Check size={40} aria-hidden="true" />
          <h2 ref={titleRef} tabIndex={-1}>
            這一組練完了
          </h2>
          <p>
            第一下就選對 {firstTry.filter(Boolean).length} / {round.length} 題
          </p>
          <p className="sound-parent-note">
            重聽後答對不算第一下選對；幾題的結果還不能判斷是否熟練。
          </p>
          <button
            type="button"
            className="sound-primary"
            onClick={() => {
              cancel();
              setRound([]);
              setHeard([]);
              setIndex(0);
              setFeedback(null);
              setFirstTry([]);
              setHadWrong(false);
              setCanChoose(false);
            }}
          >
            再聽這兩個音
          </button>
        </div>
      ) : !round.length ? (
        <div className="sound-practice-card">
          <h2 ref={titleRef} tabIndex={-1}>
            先聽聽兩個音
          </h2>
          <p>點注音聽聲音，可以多聽幾次。</p>
          <div className="sound-choice-row" dir="rtl">
            {pair.sounds.map((sound, choice) => (
              <button
                type="button"
                className="sound-choice"
                key={sound.label}
                onClick={() => compare(choice)}
                aria-label={`聽 ${sound.label}`}
              >
                <ZhuyinStack text={sound.label} literalSymbol />
                <span>{sound.caption ?? "點一下聽"}</span>
                <span className="sound-heard">
                  {heard.includes(choice) ? (
                    <>
                      <Check size={16} aria-hidden="true" />
                      聽過了
                    </>
                  ) : (
                    <SpeakerHigh size={20} aria-hidden="true" />
                  )}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="sound-primary"
            disabled={heard.length < 2 || audio.audioLoading || (playing && !audio.audioError)}
            onClick={() => {
              const questions = makeSoundRound();
              setRound(questions);
              setIndex(0);
              playQuestion(questions, 0);
            }}
          >
            開始 6 題練習
          </button>
        </div>
      ) : (
        <div className="sound-practice-card">
          <span className="sound-progress">
            第 {index + 1} 題 / {round.length}
          </span>
          <h2 ref={titleRef} tabIndex={-1}>
            你聽到哪個音？
          </h2>
          <button
            type="button"
            className="sound-replay"
            onClick={() => playQuestion()}
            disabled={feedback === "correct"}
          >
            <Headphones size={28} aria-hidden="true" />
            {audio.audioLoading
              ? "聲音載入中…"
              : playing && !audio.audioError
                ? "正在播放…"
                : "再聽一次"}
          </button>
          <div className="sound-choice-row" dir="rtl">
            {round[index].order.map((choice) => {
              const sound = pair.sounds[choice];
              return (
                <button
                  type="button"
                  className="sound-choice"
                  key={sound.label}
                  disabled={
                    !canChoose || audio.audioLoading || audio.audioError || feedback === "correct"
                  }
                  aria-label={`選 ${sound.label}`}
                  onClick={() => {
                    if (choice === round[index].target) {
                      setFeedback("correct");
                      setFirstTry((current) => [...current, !hadWrong]);
                    } else {
                      setHadWrong(true);
                      setFeedback("retry");
                      setCanChoose(false);
                    }
                  }}
                >
                  <ZhuyinStack text={sound.label} literalSymbol />
                  {sound.caption && <span>{sound.caption}</span>}
                </button>
              );
            })}
          </div>
          <p
            className={`sound-feedback${feedback === "correct" ? " is-correct" : ""}`}
            role="status"
          >
            {feedback === "correct"
              ? "聽出來了！"
              : feedback === "retry"
                ? "還不是這個音，再聽一次試試看。"
                : "聽完聲音，再選一個。"}
          </p>
          {feedback === "correct" && (
            <button
              type="button"
              className="sound-primary"
              onClick={() => {
                cancel();
                setFeedback(null);
                setHadWrong(false);
                setCanChoose(false);
                const next = index + 1;
                setIndex(next);
                if (next < round.length) playQuestion(round, next);
              }}
            >
              {index + 1 === round.length ? "完成這一組" : "下一題"}
            </button>
          )}
        </div>
      )}
      {audio.audioLoading && <p role="status">正在載入聲音…</p>}
      {audio.audioError && (
        <p className="practice-storage-error" role="alert">
          聲音未能播放，請檢查音量與網路，再點一次播放。
        </p>
      )}
    </section>
  );
}
