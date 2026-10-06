"use client";
import { ShowMsg } from "../../components/ShowMsg";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, SpeakerHigh } from "@phosphor-icons/react";
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
export function SoundPractice({ audio, onBack }: { audio: Audio; onBack?: () => void }) {
  const stopPlayback = audio.stopPlayback;
  const [pair, setPair] = useState<SoundPair | null>(null);
  const [heard, setHeard] = useState<number[]>([]);
  const [round, setRound] = useState<SoundQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [canChoose, setCanChoose] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "retry" | null>(null);
  const [firstTry, setFirstTry] = useState<boolean[]>([]);
  const [hadWrong, setHadWrong] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const generation = useRef(0);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(
    () => () => {
      generation.current += 1;
      stopPlayback();
    },
    [stopPlayback],
  );
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
      pronunciation: pair.sounds[choice].label,
      playbackRate: 1,
      allowSynthesis: false,
      onEnded: () => {
        if (token !== generation.current) return;
        setPlaying(false);
        setHeard((current) => (current.includes(choice) ? current : [...current, choice]));
      },
    });
  };
  const playQuestion = (questions = round, questionIndex = index, preserveAnswer = false) => {
    if (!pair || !questions[questionIndex]) return;
    cancel();
    const token = generation.current;
    if (!preserveAnswer) {
      setFeedback(null);
      setSelected(null);
    }
    setCanChoose(false);
    setPlaying(true);
    audio.speak(pair.sounds[questions[questionIndex].target].audioText, {
      pronunciation: pair.sounds[questions[questionIndex].target].label,
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
      onBack?.();
    }
  };
  return (
    <section className="page-section sound-practice-page">
      {(pair || onBack) && (
        <button type="button" className="sound-back" onClick={back}>
          <ArrowLeft size={18} aria-hidden="true" />
          {pair ? "換一組聲音" : "回到練習"}
        </button>
      )}
      {onBack && (
        <SectionHeading title="辨音小練習" description="一次分辨兩個音，不用寫字、不計時。" />
      )}
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
          <p>先聽兩個音，再開始練習。</p>
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
            聽一聽，選注音
          </h2>
          <button
            type="button"
            className="sound-replay"
            onClick={() => playQuestion(round, index, feedback === "correct")}
            disabled={audio.audioLoading || playing}
          >
            <img src="/course-art/listening-play-button-watercolor-v1.webp" alt="" />
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
                  className={`sound-choice${selected === choice ? (feedback === "correct" ? " is-correct" : " is-retry") : ""}`}
                  key={sound.label}
                  disabled={
                    !canChoose || audio.audioLoading || audio.audioError || feedback === "correct"
                  }
                  aria-label={`選 ${sound.label}`}
                  onClick={() => {
                    setSelected(choice);
                    if (choice === round[index].target) {
                      setFeedback("correct");
                      setFirstTry((current) => [...current, !hadWrong]);
                    } else {
                      setHadWrong(true);
                      setFeedback("retry");
                    }
                  }}
                >
                  <ZhuyinStack text={sound.label} literalSymbol />
                  {sound.caption && <span>{sound.caption}</span>}
                  {selected === choice && feedback === "correct" && (
                    <span className="sound-choice-result">
                      <Check size={18} />
                      選對了
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p
            className={`sound-inline-feedback${feedback === "correct" ? " is-correct" : ""}`}
            role="status"
          >
            {feedback === "correct" ? "" : feedback === "retry" ? "再聽一次，試試另一個。" : ""}
          </p>
          {
            <button
              type="button"
              className="sound-primary"
              disabled={feedback !== "correct"}
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
              <ArrowRight size={22} aria-hidden="true" />
            </button>
          }
        </div>
      )}
      {audio.audioLoading && <ShowMsg message={"正在載入聲音…"} />}
      {audio.audioError && (
        <ShowMsg error message="聲音未能播放，請檢查音量與網路，再點一次播放。" />
      )}
    </section>
  );
}
