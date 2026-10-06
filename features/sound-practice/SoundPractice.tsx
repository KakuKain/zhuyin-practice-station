"use client";
import { ShowMsg } from "../../components/ShowMsg";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CaretRight,
  Check,
  CheckCircle,
  XCircle,
  SpeakerHigh,
} from "@phosphor-icons/react";
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
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const generation = useRef(0);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(
    () => () => {
      generation.current += 1;
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      stopPlayback();
    },
    [stopPlayback],
  );
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, [pair, round.length, index]);
  const cancel = () => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = null;
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
      {((pair && !finished) || onBack) && (
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
          <div className="sound-selection-heading">
            <div>
              <h2 ref={titleRef} tabIndex={-1}>
                今天想練哪一組？
              </h2>
              <p>每組 6 題</p>
            </div>
            <img src="/course-art/sound-headphone-cat.webp" alt="" />
          </div>
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
                <span className="sound-pair-arrow">
                  <CaretRight size={22} weight="bold" aria-hidden="true" />
                </span>
              </button>
            ))}
          </div>
        </>
      ) : finished ? (
        <div className="sound-practice-card sound-finished">
          <img className="sound-complete-art" src="/course-art/sound-complete-cat.webp" alt="" />
          <h2 ref={titleRef} tabIndex={-1}>
            這一組練完了！
          </h2>
          <div className="sound-complete-actions">
            <button
              type="button"
              className="sound-primary"
              onClick={() => {
                cancel();
                const questions = makeSoundRound();
                setSelected(null);
                setFeedback(null);
                setRound(questions);
                setIndex(0);
                playQuestion(questions, 0);
              }}
            >
              再練一次
            </button>
            <button type="button" className="sound-secondary" onClick={reset}>
              換一組聲音
            </button>
          </div>
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
            disabled={audio.audioLoading || playing || feedback !== null}
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
                    !canChoose || audio.audioLoading || audio.audioError || feedback !== null
                  }
                  aria-label={`選 ${sound.label}`}
                  onClick={() => {
                    setSelected(choice);
                    if (choice === round[index].target) {
                      setFeedback("correct");
                      const token = generation.current;
                      feedbackTimer.current = setTimeout(() => {
                        if (token !== generation.current) return;
                        feedbackTimer.current = null;
                        setFeedback(null);
                        setSelected(null);
                        setCanChoose(false);
                        const next = index + 1;
                        setIndex(next);
                        if (next < round.length) playQuestion(round, next);
                      }, 1200);
                    } else {
                      setFeedback("retry");
                      const token = generation.current;
                      feedbackTimer.current = setTimeout(() => {
                        if (token !== generation.current) return;
                        feedbackTimer.current = null;
                        setFeedback(null);
                        setSelected(null);
                      }, 650);
                    }
                  }}
                >
                  <ZhuyinStack text={sound.label} literalSymbol />
                  {sound.caption && <span>{sound.caption}</span>}
                </button>
              );
            })}
          </div>
          <div className="sound-feedback-space" aria-hidden="true" />
          {feedback && (
            <div
              className={`sound-feedback-animation is-${feedback}`}
              role="status"
              key={`${index}-${selected}`}
            >
              {feedback === "correct" ? (
                <CheckCircle size={132} weight="fill" aria-hidden="true" />
              ) : (
                <XCircle size={112} weight="fill" aria-hidden="true" />
              )}
              <span>{feedback === "correct" ? "答對了！" : "再試一次"}</span>
            </div>
          )}
        </div>
      )}
      {audio.audioLoading && <ShowMsg message={"正在載入聲音…"} />}
      {audio.audioError && (
        <ShowMsg error message="聲音未能播放，請檢查音量與網路，再點一次播放。" />
      )}
    </section>
  );
}
