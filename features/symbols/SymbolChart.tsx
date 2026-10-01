"use client";

import { SpeakerHigh, WarningCircle } from "@phosphor-icons/react";
import { AnnotatedText } from "../../components/AnnotatedText";
import type { AppController } from "../usePracticeApp";
import { symbolGroups } from "./symbols-data";

export function SymbolChart({
  app,
}: {
  app: Pick<AppController, "playPreviewSymbol" | "playingSymbol" | "audioLoading" | "audioError">;
}) {
  const { playPreviewSymbol, playingSymbol, audioLoading, audioError } = app;
  const message = audioError
    ? "音檔無法播放，請檢查網路，再點一次格子。"
    : playingSymbol
      ? audioLoading
        ? "正在載入音檔…"
        : "正在播放發音"
      : "點一下格子，就能聽到發音。";

  return (
    <section className="page-section symbol-page">
      <div className="symbol-page-heading">
        <h1>
          <AnnotatedText text="全部注音" />
        </h1>
        <p>一起認識 37 個注音符號</p>
      </div>
      <div
        className={`symbol-audio-status${audioError ? " is-error" : ""}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="symbol-status-icon" aria-hidden="true">
          {audioError ? <WarningCircle size={23} /> : <SpeakerHigh size={23} weight="duotone" />}
        </span>
        <span>
          {playingSymbol && <span className="symbol-status-glyph">{playingSymbol}</span>}
          {message}
        </span>
        {audioLoading && <span className="symbol-audio-spinner" aria-hidden="true" />}
      </div>
      {symbolGroups.map((group) => (
        <section
          key={group.id}
          className={`symbol-group is-${group.id}`}
          aria-labelledby={`symbol-heading-${group.id}`}
        >
          <div className="symbol-group-heading">
            <h2 id={`symbol-heading-${group.id}`}>
              <AnnotatedText text={group.title} />
            </h2>
            <span>{group.count} 個符號</span>
          </div>
          <div
            className="symbol-chart-grid"
            style={{ "--symbol-columns": group.columns } as React.CSSProperties}
          >
            {group.cells.map((symbol, index) =>
              symbol ? (
                <button
                  key={symbol}
                  type="button"
                  className={`symbol-chart-button${playingSymbol === symbol ? " is-playing" : ""}`}
                  aria-label={`播放注音符號 ${symbol}`}
                  aria-pressed={playingSymbol === symbol}
                  aria-busy={playingSymbol === symbol && audioLoading}
                  onClick={() => playPreviewSymbol(symbol)}
                >
                  <span className="symbol-chart-glyph" aria-hidden="true">
                    {symbol}
                  </span>
                  {playingSymbol === symbol && (
                    <SpeakerHigh size={13} weight="fill" aria-hidden="true" />
                  )}
                </button>
              ) : (
                <span className="symbol-chart-empty" key={`empty-${index}`} aria-hidden="true" />
              ),
            )}
          </div>
        </section>
      ))}
      <p className="symbol-page-note">韻符包含介音 ㄧ、ㄨ、ㄩ。音檔以正常速度播放。</p>
      <p className="symbol-audio-credit">
        發音音檔：
        <a
          href="https://language.moe.gov.tw/001/Upload/files/site_content/M0001/juyin/html_ch/index.html"
          target="_blank"
          rel="noreferrer noopener"
        >
          教育部《國語注音符號手冊》
        </a>
      </p>
    </section>
  );
}
