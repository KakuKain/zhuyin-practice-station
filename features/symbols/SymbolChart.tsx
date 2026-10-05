"use client";

import { PageHeading } from "../../components/PageHeading";
import { SpeakerHigh } from "@phosphor-icons/react";
import { ShowMsg } from "../../components/ShowMsg";
import { AnnotatedText } from "../../components/AnnotatedText";
import type { AppController } from "../usePracticeApp";
import { symbolGroups, combinedRhymeGroups } from "./symbols-data";
import { combinedRhymeExample } from "./combined-rhyme-audio";

export function SymbolChart({
  app,
}: {
  app: Pick<AppController, "playPreviewSymbol" | "playingSymbol" | "audioLoading" | "audioError">;
}) {
  const { playPreviewSymbol, playingSymbol, audioLoading, audioError } = app;
  const playingExample = combinedRhymeExample(playingSymbol ?? "");
  const message = audioError
    ? "音檔無法播放，請檢查網路，再點一次格子。"
    : playingSymbol
      ? audioLoading
        ? "正在載入音檔…"
        : "正在播放發音"
      : "點一下格子，就能聽到發音。";

  return (
    <section className="page-section symbol-page">
      <PageHeading title="全部注音" description="一起認識 37 個基本符號與 22 個結合韻" />
      {playingSymbol || audioError ? (
        <ShowMsg
          key={`${playingSymbol}-${audioLoading}-${audioError}`}
          message={`${playingSymbol ?? ""}${playingExample ? ` · 例字「${playingExample.character}」${playingExample.tone}` : ""} ${message}`}
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
            <h2 id={`symbol-heading-${group.id}`}>
              <AnnotatedText text={group.title} />
            </h2>
            <span>{group.count} 個符號</span>
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
        <p className="symbol-page-note">
          播放教育部例字完整錄音，包含字音、部首與筆畫。「崖」示範第二聲，其餘例字為第一聲。
        </p>
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
                  aria-label={`播放結合韻 ${rhyme}，例字${combinedRhymeExample(rhyme)?.character}，${combinedRhymeExample(rhyme)?.tone}完整錄音`}
                  aria-pressed={playingSymbol === rhyme}
                  aria-busy={playingSymbol === rhyme && audioLoading}
                  onClick={() => playPreviewSymbol(rhyme)}
                >
                  <span className="symbol-chart-glyph" aria-hidden="true">
                    {String.fromCodePoint(0xe100 + [0, 10, 18][groupIndex] + rhymeIndex)}
                  </span>
                  <span className="combined-rhyme-example" aria-hidden="true">
                    {combinedRhymeExample(rhyme)?.character} · {rhyme === "ㄧㄞ" ? "二聲" : "一聲"}
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
        。結合韻例字錄音：中華民國教育部（Ministry of Education, R.O.C.）
        <a href="https://dict.concised.moe.edu.tw/" target="_blank" rel="noreferrer noopener">
          《國語辭典簡編本》
        </a>
        （版本 2014_20260929），原始錄音未修改。
        <a
          href="https://creativecommons.org/licenses/by-nd/3.0/tw/"
          target="_blank"
          rel="noreferrer noopener"
        >
          CC BY-ND 3.0 臺灣
        </a>
        ，
        <a
          href="/listening-audio/moe-examples/使用說明.pdf"
          target="_blank"
          rel="noreferrer noopener"
        >
          公眾授權使用說明
        </a>
        。
      </p>
    </section>
  );
}
