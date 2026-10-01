"use client";

import type { CSSProperties } from "react";
import type { AppController } from "../usePracticeApp";
import { Eraser, Play } from "@phosphor-icons/react";

export function ListeningCanvas({
  app,
}: {
  app: Pick<
    AppController,
    | "beginDrawing"
    | "canvasRef"
    | "clearCanvas"
    | "clearWordCanvas"
    | "draw"
    | "endDrawing"
    | "isWordQuestion"
    | "listenPhase"
    | "replayQuestion"
    | "startRetryWriting"
    | "wordCanvasRefs"
    | "wordInk"
    | "wordLength"
  >;
}) {
  const {
    beginDrawing,
    canvasRef,
    clearCanvas,
    clearWordCanvas,
    draw,
    endDrawing,
    isWordQuestion,
    listenPhase,
    replayQuestion,
    startRetryWriting,
    wordCanvasRefs,
    wordInk,
    wordLength,
  } = app;
  return (
    <div
      className={`canvas-zone ${isWordQuestion ? "is-word" : ""} ${["review", "remediation_offer", "choice", "retry_ready"].includes(listenPhase) ? "is-locked" : ""}`}
      style={isWordQuestion ? ({ "--word-count": wordLength } as CSSProperties) : undefined}
    >
      <div className="canvas-surface">
        {isWordQuestion ? (
          <div
            className="word-canvas-stack"
            dir="rtl"
            role="group"
            aria-label={`語詞 ${wordLength} 格田字格`}
          >
            {Array.from({ length: wordLength }, (_, index) => (
              <div className="word-canvas-row" key={index}>
                <div className="word-canvas-tools">
                  <span className="word-paper-label" aria-hidden="true">
                    第{index + 1}字
                  </span>
                  <button
                    type="button"
                    className="word-paper-clear"
                    aria-label={`清除語詞第 ${index + 1} 字`}
                    title={`清除第 ${index + 1} 字`}
                    disabled={
                      !wordInk[index] || (listenPhase !== "active" && listenPhase !== "retry")
                    }
                    onClick={() => clearWordCanvas(index)}
                  >
                    <Eraser size={19} aria-hidden="true" />
                  </button>
                </div>
                <div className="canvas-paper word-paper">
                  <canvas
                    ref={(element) => {
                      wordCanvasRefs.current[index] = element;
                    }}
                    data-word-index={index}
                    onPointerDown={beginDrawing}
                    onPointerMove={draw}
                    onPointerUp={endDrawing}
                    onPointerCancel={endDrawing}
                    onPointerLeave={endDrawing}
                    aria-label={`語詞第 ${index + 1} 字田字格手寫區`}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="canvas-paper">
            <canvas
              ref={canvasRef}
              onPointerDown={beginDrawing}
              onPointerMove={draw}
              onPointerUp={endDrawing}
              onPointerCancel={endDrawing}
              onPointerLeave={endDrawing}
              aria-label="田字格手寫區"
            />
          </div>
        )}
        {listenPhase === "choice" && (
          <div className="canvas-replay-overlay">
            <button
              type="button"
              className="canvas-replay-button"
              onClick={replayQuestion}
              aria-label="再播放一次題目"
            >
              <Play size={30} weight="fill" aria-hidden="true" />
            </button>
            <span>點一下，再聽一次</span>
          </div>
        )}
        {listenPhase === "retry_ready" && (
          <div className="canvas-replay-overlay retry-ready-overlay">
            <strong>選對了！再聽一次，重新寫。</strong>
            <button type="button" onClick={startRetryWriting}>
              <Play size={22} weight="fill" aria-hidden="true" /> 再聽一次並重寫
            </button>
          </div>
        )}
      </div>
      <div className="canvas-toolbar">
        <span>{isWordQuestion ? "每格寫一字；可分別清除" : "田字格"}</span>
        {!isWordQuestion && (
          <button
            type="button"
            aria-label="清除重寫"
            onClick={clearCanvas}
            disabled={listenPhase !== "active" && listenPhase !== "retry"}
          >
            <Eraser size={20} aria-hidden="true" /> 清除
          </button>
        )}
      </div>
    </div>
  );
}
