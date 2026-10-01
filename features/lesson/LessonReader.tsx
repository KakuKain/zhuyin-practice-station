"use client";

import type { AppController } from "../usePracticeApp";
import { courseArtwork, exercises, previewPronunciationVariants } from "../courses/course-data";
import { ArrowLeft, ArrowRight, Headphones, PencilLine, SpeakerHigh } from "@phosphor-icons/react";

export function LessonReader({
  app,
}: {
  app: Pick<
    AppController,
    | "lesson"
    | "openFill"
    | "openListening"
    | "playPreviewSymbol"
    | "playingSymbol"
    | "previewColumns"
    | "previewMode"
    | "previewPage"
    | "previewPageCount"
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
    previewPointerStartRef,
    previewVisibleLines,
    previewWheelAtRef,
    selectedLesson,
    setPreviewMode,
    setPreviewPage,
  } = app;
  return (
    <section className="page-section lesson-page">
      <div className={`lesson-heading${selectedLesson === 7 ? " is-radish" : ""}`}>
        <div>
          <span className="eyebrow">LESSON {String(selectedLesson + 1).padStart(2, "0")}</span>
          <h1>{lesson.title}</h1>
        </div>
        <img
          className="lesson-heading-art"
          src={
            selectedLesson === 7
              ? "/course-art/radish-story.webp"
              : `/course-art/${courseArtwork[selectedLesson]}-watercolor.webp`
          }
          alt=""
        />
      </div>
      {exercises[selectedLesson] && (
        <div className="mode-grid">
          <button className="mode-card fill-mode" type="button" onClick={openFill}>
            <span className="mode-icon" aria-hidden="true">
              <PencilLine size={28} weight="duotone" />
            </span>
            <span className="lesson-mode-copy">
              <small>第一關</small>
              <strong>課文默寫</strong>
            </span>
            <span className="lesson-mode-cta">
              開始 <ArrowRight size={19} weight="bold" aria-hidden="true" />
            </span>
          </button>
          <button className="mode-card listen-mode" type="button" onClick={openListening}>
            <span className="mode-icon" aria-hidden="true">
              <Headphones size={28} weight="duotone" />
            </span>
            <span className="lesson-mode-copy">
              <small>第二關</small>
              <strong>聽寫</strong>
            </span>
            <span className="lesson-mode-cta">
              開始 <ArrowRight size={19} weight="bold" aria-hidden="true" />
            </span>
          </button>
        </div>
      )}
      <div className="lesson-curriculum">
        <div className="lesson-curriculum-heading">
          <strong>課文</strong>
          <div className="lesson-preview-switch" role="group" aria-label="課文顯示方式">
            <button
              type="button"
              aria-pressed={previewMode === "annotated"}
              onClick={() => setPreviewMode("annotated")}
            >
              國字＋注音
            </button>
            <button
              type="button"
              aria-pressed={previewMode === "zhuyin"}
              onClick={() => setPreviewMode("zhuyin")}
            >
              純注音
            </button>
          </div>
        </div>
        <div
          className={`lesson-text-lines ${previewMode === "zhuyin" ? "is-zhuyin-only" : ""}`}
          dir="rtl"
          aria-label={`${lesson.title}課文，第 ${previewPage + 1} 頁，共 ${previewPageCount} 頁，由右向左閱讀`}
          style={
            {
              "--preview-columns": previewColumns,
              "--preview-max-chars": Math.max(
                ...lesson.lines.map((line) => Array.from(line).length),
              ),
            } as React.CSSProperties
          }
          onPointerDown={(event) => {
            previewPointerStartRef.current = { x: event.clientX, y: event.clientY };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerCancel={() => {
            previewPointerStartRef.current = null;
          }}
          onPointerUp={(event) => {
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
            const lineIndex = previewPage * previewColumns + pageLineIndex;
            return (
              <div className="lesson-text-line" dir="ltr" key={lineIndex}>
                {Array.from(line).map((char, charIndex) => (
                  <span key={charIndex}>
                    {char}
                    {previewPronunciationVariants[selectedLesson]?.[lineIndex]?.[charIndex] ?? ""}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
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
        <div className="lesson-curriculum-heading">
          <strong>注音符號</strong>
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
      </div>
      <div className="lesson-meadow-footer" aria-hidden="true" />
      {!exercises[selectedLesson] && (
        <p className="lesson-upcoming">這一課的課文默寫與聽寫練習準備中。</p>
      )}
    </section>
  );
}
