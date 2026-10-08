"use client";

import { ProgressiveImage } from "../../components/ProgressiveImage";

import type { AppController } from "../usePracticeApp";
import { previewPronunciationVariants } from "../courses/course-data";
import { AnnotatedText } from "../../components/AnnotatedText";
import { ZhuyinStack } from "../../components/Zhuyin";
import { LessonTitle } from "../../components/LessonTitle";
import { registeredLessonAudioUrl } from "../../lib/audio/audio-registry";
import { useReaderPosition } from "./useReaderPosition";
import {
  ArrowLeft,
  ArrowRight,
  Headphones,
  PencilLine,
  SpeakerHigh,
  Stop,
} from "@phosphor-icons/react";

export function LessonReader({
  app,
}: {
  app: Pick<
    AppController,
    | "lesson"
    | "lessonLines"
    | "openFill"
    | "openListening"
    | "playPreviewSymbol"
    | "playingSymbol"
    | "speak"
    | "stopPlayback"
    | "audioLoading"
    | "audioError"
    | "previewColumns"
    | "previewMode"
    | "previewPage"
    | "previewPageCount"
    | "previewPageStart"
    | "previewPointerStartRef"
    | "previewVisibleLines"
    | "previewWheelAtRef"
    | "selectedLesson"
    | "setPreviewMode"
    | "setPreviewPage"
  >;
}) {
  const {
    lesson,
    openFill,
    openListening,
    playPreviewSymbol,
    playingSymbol,
    previewColumns,
    previewMode,
    previewPage,
    previewPageCount,
    previewPageStart,
    previewPointerStartRef,
    previewVisibleLines,
    previewWheelAtRef,
    selectedLesson,
    setPreviewMode,
    setPreviewPage,
  } = app;
  const readerRef = useReaderPosition(previewPage, previewMode);
  const readingKey = `lesson-reading-${selectedLesson + 1}`;
  const reading = playingSymbol === readingKey;
  return (
    <section className="page-section lesson-page">
      <div className={`lesson-heading${selectedLesson === 7 ? " is-radish" : ""}`}>
        <div>
          <span className="eyebrow">
            <AnnotatedText text={`第${lesson.number}課`} />
          </span>
          <LessonTitle lessonIndex={selectedLesson} />
        </div>
        {!lesson.custom && (
          <ProgressiveImage
            className="lesson-heading-art"
            src={
              selectedLesson === 7
                ? "/course-art/radish-story.webp"
                : lesson.artwork
                  ? `/course-art/${lesson.artwork}-watercolor.webp`
                  : "/course-art/lesson-watercolor-paper.webp"
            }
            alt=""
          />
        )}
      </div>
      {lesson.exercise && (
        <div className="mode-grid">
          <button className="mode-card fill-mode" type="button" onClick={openFill}>
            <span className="mode-icon" aria-hidden="true">
              <PencilLine size={28} weight="duotone" />
            </span>
            <span className="lesson-mode-copy">
              <small>
                <AnnotatedText text="第一關" />
              </small>
              <strong>
                <AnnotatedText text={lesson.custom ? "注音默寫" : "課文默寫"} />
              </strong>
            </span>
            <span className="lesson-mode-cta">
              <AnnotatedText text="開始" />{" "}
              <ArrowRight size={19} weight="bold" aria-hidden="true" />
            </span>
          </button>
          <button className="mode-card listen-mode" type="button" onClick={openListening}>
            <span className="mode-icon" aria-hidden="true">
              <Headphones size={28} weight="duotone" />
            </span>
            <span className="lesson-mode-copy">
              <small>
                <AnnotatedText text="第二關" />
              </small>
              <strong>
                <AnnotatedText text="聽寫" />
              </strong>
            </span>
            <span className="lesson-mode-cta">
              <AnnotatedText text="開始" />{" "}
              <ArrowRight size={19} weight="bold" aria-hidden="true" />
            </span>
          </button>
        </div>
      )}
      <div className="lesson-curriculum">
        {!lesson.custom && selectedLesson < 9 && (
          <div className="lesson-reading-controls">
            <button
              type="button"
              className="lesson-reading-button"
              aria-pressed={reading}
              onClick={() =>
                reading
                  ? app.stopPlayback()
                  : app.speak(readingKey, {
                      url: registeredLessonAudioUrl(selectedLesson) ?? undefined,
                      allowSynthesis: false,
                    })
              }
            >
              {reading ? <Stop size={22} weight="fill" /> : <SpeakerHigh size={22} />}
              {reading ? (app.audioLoading ? "載入語音…" : "停止朗讀") : "朗讀課文"}
            </button>
            {app.audioError && <span role="status">語音無法播放，請再試一次。</span>}
          </div>
        )}
        <div className="lesson-curriculum-heading">
          <strong>
            <AnnotatedText text={lesson.custom ? "字詞預覽" : "課文"} />
          </strong>
          <div className="lesson-preview-switch" role="group" aria-label="課文顯示方式">
            <button
              type="button"
              aria-pressed={previewMode === "annotated"}
              onClick={() => setPreviewMode("annotated")}
            >
              <AnnotatedText text="國字＋注音" />
            </button>
            <button
              type="button"
              aria-pressed={previewMode === "zhuyin"}
              onClick={() => setPreviewMode("zhuyin")}
            >
              <AnnotatedText text="純注音" />
            </button>
          </div>
        </div>
        {lesson.custom ? (
          <div className="material-word-preview" aria-label="已確認的字詞與注音">
            {lesson.terms.map((term) => (
              <div
                className="material-word-card"
                key={term.text}
                aria-label={`${term.text}，${term.syllables.join(" ")}`}
              >
                {Array.from(term.text).map((character, index) => (
                  <span className="material-word-character" key={index}>
                    {previewMode === "annotated" && (
                      <span className="material-character-text">{character}</span>
                    )}
                    <ZhuyinStack text={term.syllables[index]} />
                  </span>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <>
            <div
              className={`lesson-text-lines ${previewMode === "zhuyin" ? "is-zhuyin-only" : ""}`}
              ref={readerRef}
              role="region"
              tabIndex={-1}
              dir="rtl"
              aria-label={`${lesson.title}課文，第 ${previewPage + 1} 頁，共 ${previewPageCount} 頁，由右向左閱讀`}
              style={
                {
                  "--preview-columns": Math.min(previewColumns, previewVisibleLines.length),
                  "--preview-max-chars": Math.max(
                    ...lesson.lines.map((line) => Array.from(line).length),
                  ),
                } as React.CSSProperties
              }
              onPointerDown={(event) => {
                // A second finger means pinch-zoom, not a page swipe.
                if (!event.isPrimary) {
                  previewPointerStartRef.current = null;
                  return;
                }
                previewPointerStartRef.current = { x: event.clientX, y: event.clientY };
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerCancel={() => {
                previewPointerStartRef.current = null;
              }}
              onPointerUp={(event) => {
                if (!event.isPrimary) return;
                const start = previewPointerStartRef.current;
                previewPointerStartRef.current = null;
                if (!start) return;
                const dx = event.clientX - start.x;
                const dy = event.clientY - start.y;
                if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
                setPreviewPage((page) =>
                  Math.max(0, Math.min(previewPageCount - 1, page + (dx > 0 ? 1 : -1))),
                );
              }}
              onWheel={(event) => {
                if (
                  Math.abs(event.deltaX) < 35 ||
                  Math.abs(event.deltaX) < Math.abs(event.deltaY) * 1.3 ||
                  Date.now() - previewWheelAtRef.current < 450
                )
                  return;
                previewWheelAtRef.current = Date.now();
                setPreviewPage((page) =>
                  Math.max(0, Math.min(previewPageCount - 1, page + (event.deltaX < 0 ? 1 : -1))),
                );
              }}
            >
              {previewVisibleLines.map((line, pageLineIndex) => {
                const lineIndex = previewPageStart + pageLineIndex;
                return (
                  <div className="lesson-text-line" dir="ltr" key={lineIndex}>
                    {Array.from(line).map((char, charIndex) => (
                      <span key={charIndex}>
                        {char}
                        {previewPronunciationVariants[selectedLesson]?.[lineIndex]?.[charIndex] ??
                          ""}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          </>
        )}
        {previewPageCount > 1 && (
          <div className="lesson-page-controls" aria-label="課文翻頁">
            <div className="lesson-page-action">
              <button
                type="button"
                className="lesson-page-circle"
                onClick={() => setPreviewPage((page) => Math.min(previewPageCount - 1, page + 1))}
                disabled={previewPage >= previewPageCount - 1}
                aria-label="下一頁"
              >
                <ArrowLeft size={27} weight="bold" aria-hidden="true" />
              </button>
              <small>下一頁</small>
            </div>
            <div className="lesson-page-position">
              <div className="lesson-page-dots" aria-hidden="true">
                {Array.from({ length: previewPageCount }, (_, index) => (
                  <i className={index === previewPage ? "is-current" : ""} key={index} />
                ))}
              </div>
              <span className="lesson-page-counter" aria-live="polite">
                第 {previewPage + 1} / {previewPageCount} 頁
              </span>
            </div>
            <div className="lesson-page-action">
              <button
                type="button"
                className="lesson-page-circle"
                onClick={() => setPreviewPage((page) => Math.max(0, page - 1))}
                disabled={previewPage === 0}
                aria-label="上一頁"
              >
                <ArrowRight size={27} weight="bold" aria-hidden="true" />
              </button>
              <small>上一頁</small>
            </div>
          </div>
        )}
        {lesson.symbols.length > 0 && (
          <>
            <div className="lesson-curriculum-heading">
              <strong>
                <AnnotatedText text="注音符號" />
              </strong>
            </div>
            <div className="lesson-symbols" dir="rtl" aria-label="本課注音符號，點選可聽發音">
              {lesson.symbols.map((symbol) => (
                <button
                  type="button"
                  className={`${symbol.length > 1 ? "is-combination " : ""}${playingSymbol === symbol ? "is-playing" : ""}`}
                  key={symbol}
                  onClick={() => playPreviewSymbol(symbol)}
                  aria-label={`播放注音符號 ${symbol}`}
                >
                  <span>{symbol}</span>
                  <SpeakerHigh size={15} weight="fill" aria-hidden="true" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="lesson-meadow-footer" aria-hidden="true" />
      {!lesson.exercise && <p className="lesson-upcoming">這一課的課文默寫與聽寫練習準備中。</p>}
    </section>
  );
}
