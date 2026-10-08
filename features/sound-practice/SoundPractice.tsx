"use client";
import { ShowMsg } from "../../components/ShowMsg";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CaretRight, CheckCircle, XCircle } from "@phosphor-icons/react";
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
  const [previewingSound, setPreviewingSound] = useState<number | null>(null);
  const [round, setRound] = useState<SoundQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [canChoose, setCanChoose] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "retry" | null>(null);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const generation = useRef(0);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(
    () => () => {
      generation.current += 1;
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      if (previewTimer.current) clearTimeout(previewTimer.current);
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
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = null;
    generation.current += 1;
    audio.stopPlayback();
    setPlaying(false);
    setPreviewingSound(null);
  };
  const compare = () => {
    if (!pair) return;
    cancel();
    const token = generation.current;
    setPlaying(true);
    const playSound = (choice: number) => {
      if (token !== generation.current) return;
      audio.speak(pair.sounds[choice].audioText, {
        pronunciation: pair.sounds[choice].label,
        playbackRate: 1,
        allowSynthesis: false,
        onStarted: () => {
          if (token === generation.current) setPreviewingSound(choice);
        },
        onError: () => {
          if (token !== generation.current) return;
          generation.current += 1;
          setPreviewingSound(null);
          setPlaying(false);
        },
        onEnded: () => {
          if (token !== generation.current) return;
          setPreviewingSound(null);
          if (choice === 0) {
            previewTimer.current = setTimeout(() => {
              previewTimer.current = null;
              playSound(1);
            }, 650);
          } else setPlaying(false);
        },
      });
    };
    playSound(0);
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
      onError: () => {
        if (token === generation.current) setPlaying(false);
      },
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
  const answering = round.length > 0 && !finished;
  const backControl = ((pair && !finished) || onBack) && (
    <button type="button" className="sound-back" onClick={back}>
      <ArrowLeft size={18} aria-hidden="true" />
      {pair ? (!round.length ? "換一組" : "換一組聲音") : "回到練習"}
    </button>
  );
  return (
    <section
      className={`page-section sound-practice-page${!pair ? " is-selecting" : !round.length ? " is-comparing" : answering ? " is-answering" : ""}`}
    >
      {answering ? (
        <div className="sound-question-toolbar">
          {backControl}
          <span className="sound-progress" aria-label={`第 ${index + 1} 題，共 ${round.length} 題`}>
            {index + 1} / {round.length}
          </span>
        </div>
      ) : (
        backControl
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
                aria-label={item.title}
                className={item.id === "tone-2-3" ? "is-tone-pair" : undefined}
                onClick={() => {
                  cancel();
                  setPair(item);
                }}
              >
                <span className="sound-pair-label" aria-hidden="true">
                  <span>{item.title.split(" / ")[0]}</span>
                  <span className="sound-pair-connector">與</span>
                  <span>{item.title.split(" / ")[1]}</span>
                </span>
                <span className="sound-pair-arrow" aria-hidden="true">
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
        <div className="sound-comparison">
          <div className="sound-comparison-heading">
            <h2 ref={titleRef} tabIndex={-1}>
              聽聽兩個音
            </h2>
            <img src="/course-art/sound-headphone-cat.webp" alt="" />
          </div>
          <div className="sound-comparison-symbols" dir="rtl" aria-label={pair.title}>
            {pair.sounds.map((sound, choice) => (
              <span
                className={`sound-preview-symbol${previewingSound === choice ? " is-speaking" : ""}`}
                key={sound.label}
                data-symbol={sound.label}
              >
                <ZhuyinStack text={sound.label} literalSymbol />
                {sound.caption && <span className="sound-preview-caption">{sound.caption}</span>}
              </span>
            ))}
            <span className="sound-comparison-connector" aria-hidden="true">
              與
            </span>
          </div>
          <button
            type="button"
            className="sound-comparison-play"
            onClick={() => (playing ? cancel() : compare())}
            aria-busy={audio.audioLoading}
          >
            <img
              src={
                playing
                  ? "/course-art/listening-stop-button-watercolor-v1.webp"
                  : "/course-art/listening-play-button-watercolor-v1.webp"
              }
              alt=""
            />
            <span>{playing ? "停止播放" : "依序聽兩個音"}</span>
          </button>
          <span className="visually-hidden" role="status">
            {previewingSound !== null ? `正在播放 ${pair.sounds[previewingSound].label}` : ""}
          </span>
          <button
            type="button"
            className="sound-primary"
            onClick={() => {
              const questions = makeSoundRound();
              setRound(questions);
              setIndex(0);
              playQuestion(questions, 0);
            }}
          >
            開始練習 <ArrowRight size={22} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="sound-practice-card sound-question-card">
          <h2 ref={titleRef} tabIndex={-1}>
            你聽到哪個音？
          </h2>
          <div className="sound-question-listening">
            <img className="sound-question-cat" src="/course-art/sound-headphone-cat.webp" alt="" />
            <button
              type="button"
              className="sound-replay"
              onClick={() => playQuestion(round, index, feedback === "correct")}
              disabled={audio.audioLoading || playing || feedback !== null}
              aria-busy={audio.audioLoading}
            >
              <img src="/course-art/listening-play-button-watercolor-v1.webp" alt="" />
              <span>
                {audio.audioLoading
                  ? "聲音載入中…"
                  : playing && !audio.audioError
                    ? "正在播放…"
                    : "再聽一次"}
              </span>
            </button>
          </div>
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
