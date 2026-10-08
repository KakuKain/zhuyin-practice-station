"use client";

import { useEffect, useRef } from "react";
import { PageHeading } from "../../components/PageHeading";
import { ProgressiveImage } from "../../components/ProgressiveImage";
import { SpeakerHigh } from "@phosphor-icons/react";
import { ShowMsg } from "../../components/ShowMsg";
import type { AppController } from "../usePracticeApp";
import { symbolGroups, combinedRhymeGroups } from "./symbols-data";

export function SymbolChart({
  app,
}: {
  app: Pick<
    AppController,
    "playPreviewSymbol" | "playingSymbol" | "audioLoading" | "audioError" | "warmSymbols"
  >;
}) {
  const { playPreviewSymbol, playingSymbol, audioLoading, audioError, warmSymbols } = app;
  const pageRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Prepare only clips whose buttons are about to be visible.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        warmSymbols(
          visible
            .map((entry) => (entry.target as HTMLElement).dataset.audioText)
            .filter((text): text is string => Boolean(text)),
        );
        visible.forEach((entry) => observer.unobserve(entry.target));
      },
      { rootMargin: "120px" },
    );
    pageRef.current
      ?.querySelectorAll("[data-audio-text]")
      .forEach((button) => observer.observe(button));
    return () => observer.disconnect();
  }, [warmSymbols]);

  const message = audioError
    ? "音檔無法播放，請檢查網路，再點一次格子。"
    : playingSymbol
      ? audioLoading
        ? "正在載入音檔…"
        : "正在播放發音"
      : "點一下格子，就能聽到發音。";

  return (
    <section className="page-section symbol-page" ref={pageRef}>
      <ProgressiveImage
        className="symbol-page-watercolor"
        src="/course-art/symbol-chart-watercolor.webp"
        alt=""
        aria-hidden="true"
      />
      <PageHeading title="全部注音" description="37 個基本符號・22 個結合韻" />
      {playingSymbol || audioError ? (
        <ShowMsg
          key={`${playingSymbol}-${audioLoading}-${audioError}`}
          message={`${playingSymbol ?? ""} ${message}`}
          error={Boolean(audioError)}
        />
      ) : null}
      {symbolGroups.map((group) => (
        <section
          key={group.id}
          className={`symbol-group is-${group.id}`}
          aria-labelledby={`symbol-heading-${group.id}`}
        >
          <div className="symbol-group-heading">
            <h2 id={`symbol-heading-${group.id}`}>{group.title}</h2>
            <span>{group.count} 個</span>
          </div>
          <div
            className="symbol-chart-grid"
            dir="rtl"
            style={{ "--symbol-columns": group.columns } as React.CSSProperties}
          >
            {group.cells.map((symbol, index) =>
              symbol ? (
                <button
                  key={symbol}
                  type="button"
                  className={`symbol-chart-button${playingSymbol === symbol ? " is-playing" : ""}`}
                  data-audio-text={symbol}
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
      <section className="combined-rhymes" aria-labelledby="combined-rhymes-heading">
        <h2 id="combined-rhymes-heading">結合韻</h2>
        <p className="symbol-page-note">結合韻使用合成語音，只播放音節。「ㄧㄞ」為第二聲示範。</p>
        {combinedRhymeGroups.map((group, groupIndex) => (
          <section
            className="symbol-group is-combined"
            key={group.id}
            aria-labelledby={`combined-${group.id}`}
          >
            <div className="symbol-group-heading">
              <h3 id={`combined-${group.id}`}>{group.title}</h3>
              <span>{group.cells.length} 個</span>
            </div>
            <div
              className="symbol-chart-grid"
              dir="rtl"
              style={{ "--symbol-columns": 4 } as React.CSSProperties}
            >
              {group.cells.map((rhyme, rhymeIndex) => (
                <button
                  key={rhyme}
                  type="button"
                  className={`symbol-chart-button${playingSymbol === rhyme ? " is-playing" : ""}`}
                  data-audio-text={rhyme}
                  aria-label={`播放結合韻 ${rhyme}`}
                  aria-pressed={playingSymbol === rhyme}
                  aria-busy={playingSymbol === rhyme && audioLoading}
                  onClick={() => playPreviewSymbol(rhyme)}
                >
                  <span className="symbol-chart-glyph" aria-hidden="true">
                    {String.fromCodePoint(0xe100 + [0, 10, 18][groupIndex] + rhymeIndex)}
                  </span>
                  {playingSymbol === rhyme && (
                    <SpeakerHigh size={13} weight="fill" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          </section>
        ))}
      </section>
      <p className="symbol-page-note">韻符包含介音 ㄧ、ㄨ、ㄩ。所有音檔以正常速度播放。</p>
      <p className="symbol-audio-credit">
        發音音檔：
        <a
          href="https://language.moe.gov.tw/001/Upload/files/site_content/M0001/juyin/html_ch/index.html"
          target="_blank"
          rel="noreferrer noopener"
        >
          教育部《國語注音符號手冊》
        </a>
        。結合韻：台灣中文合成語音。
      </p>
    </section>
  );
}
