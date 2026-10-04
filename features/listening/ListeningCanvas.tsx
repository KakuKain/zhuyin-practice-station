"use client";

import { useState, type CSSProperties } from "react";
import type { AppController } from "../usePracticeApp";
import { ShowMsg } from "../../components/ShowMsg";
import { Play } from "@phosphor-icons/react";
import { InkTools } from "../../components/InkTools";

export function ListeningCanvas({
  app,
}: {
  app: Pick<
    AppController,
    | "beginDrawing"
    | "canvasRef"
    | "clearWordCanvas"
    | "clearListeningCell"
    | "listeningEraserCell"
    | "listeningUndoAvailable"
    | "listeningInkNotice"
    | "toggleListeningEraser"
    | "undoListeningInk"
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
    clearWordCanvas,
    clearListeningCell,
    listeningEraserCell,
    listeningUndoAvailable,
    listeningInkNotice,
    toggleListeningEraser,
    undoListeningInk,
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
  const [activeWordCell, setActiveWordCell] = useState(0);
  return (
    <div
      className={`canvas-zone ${isWordQuestion ? "is-word" : ""} ${["review", "remediation_offer", "choice", "retry_ready"].includes(listenPhase) ? "is-locked" : ""}`}
      style={isWordQuestion ? ({ "--word-count": wordLength } as CSSProperties) : undefined}
    >
      {!isWordQuestion && (
        <div className="canvas-ink-tools">
          {
            <InkTools
              erasing={listeningEraserCell === 0}
              hasInk={Boolean(wordInk[0])}
              canUndo={Boolean(listeningUndoAvailable[0])}
              disabled={listenPhase !== "active" && listenPhase !== "retry"}
              onEraser={() => toggleListeningEraser(0)}
              onUndo={() => undoListeningInk(0)}
              onClear={() => clearListeningCell(0)}
            />
          }
        </div>
      )}
      {isWordQuestion && (
        <div className="word-cell-navigation">
          <button
            type="button"
            disabled={activeWordCell === 0}
            onClick={() => setActiveWordCell((index) => index - 1)}
          >
            上一字
          </button>
          <strong>
            第 {activeWordCell + 1} 字 / {wordLength}
          </strong>
          <button
            type="button"
            disabled={activeWordCell === wordLength - 1}
            onClick={() => setActiveWordCell((index) => index + 1)}
          >
            下一字
          </button>
        </div>
      )}
      <div className="canvas-surface">
        {isWordQuestion ? (
          <div
            className="word-canvas-stack"
            dir="rtl"
            role="group"
            aria-label={`語詞 ${wordLength} 格田字格`}
          >
            {Array.from({ length: wordLength }, (_, index) => (
              <div className="word-canvas-row" key={index} hidden={index !== activeWordCell}>
                <div className="word-canvas-tools">
                  <span className="word-paper-label" aria-hidden="true">
                    第{index + 1}字
                  </span>
                  <InkTools
                    cellLabel={`語詞第 ${index + 1} 字`}
                    erasing={listeningEraserCell === index}
                    hasInk={Boolean(wordInk[index])}
                    canUndo={Boolean(listeningUndoAvailable[index])}
                    disabled={listenPhase !== "active" && listenPhase !== "retry"}
                    onEraser={() => toggleListeningEraser(index)}
                    onUndo={() => undoListeningInk(index)}
                    onClear={() => clearWordCanvas(index)}
                  />
                </div>
                <div className="canvas-paper word-paper">
                  <canvas
                    ref={(element) => {
                      wordCanvasRefs.current[index] = element;
                    }}
                    data-word-index={index}
                    className={listeningEraserCell === index ? "is-erasing" : undefined}
                    onPointerDown={beginDrawing}
                    onPointerMove={draw}
                    onPointerUp={endDrawing}
                    onPointerCancel={endDrawing}
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
              className={listeningEraserCell === 0 ? "is-erasing" : undefined}
              onPointerDown={beginDrawing}
              onPointerMove={draw}
              onPointerUp={endDrawing}
              onPointerCancel={endDrawing}
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
        {(listenPhase === "active" || listenPhase === "retry") && (
          <ShowMsg message={listeningInkNotice} />
        )}
      </div>
    </div>
  );
}
