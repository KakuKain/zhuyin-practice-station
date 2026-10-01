"use client";

import type { AppController } from "../usePracticeApp";
import { ArrowLeft, ArrowRight, Info, MusicNotes, Question } from "@phosphor-icons/react";
import { siteReleaseNotes } from "../courses/course-data";

export function SettingsScreen({
  app,
}: {
  app: Pick<
    AppController,
    "listeningSettings" | "morePanel" | "setListeningSettings" | "setMorePanel" | "setView"
  >;
}) {
  const { listeningSettings, morePanel, setListeningSettings, setMorePanel, setView } = app;

  if (morePanel === "home")
    return (
      <section className="page-section more-page">
        <h1 className="more-title">
          <span>更多</span>
        </h1>
        <div className="more-group">
          <h2>練習設定</h2>
          <div className="more-settings-list">
            <button type="button" onClick={() => setMorePanel("listening")}>
              <span className="more-row-icon blue">
                <MusicNotes size={21} aria-hidden="true" />
              </span>
              <span>
                <strong>聽寫設定</strong>
                <small>
                  播放 {listeningSettings.repeatCount} 次 · 間隔 {listeningSettings.intervalSeconds}{" "}
                  秒
                </small>
              </span>
              <span className="more-arrow" aria-hidden="true">
                <ArrowRight size={21} weight="bold" />
              </span>
            </button>
          </div>
        </div>
        <div className="more-group">
          <h2>資訊與協助</h2>
          <div className="more-settings-list">
            <button type="button" onClick={() => setMorePanel("help")}>
              <span className="more-row-icon green">
                <Question size={21} aria-hidden="true" />
              </span>
              <span>
                <strong>使用說明</strong>
                <small>課文默寫、聽寫與錯題重練</small>
              </span>
              <span className="more-arrow" aria-hidden="true">
                <ArrowRight size={21} weight="bold" />
              </span>
            </button>
            <button type="button" onClick={() => setMorePanel("versions")}>
              <span className="more-row-icon orange">
                <Info size={21} aria-hidden="true" />
              </span>
              <span>
                <strong>版本</strong>
                <small>目前 {siteReleaseNotes[0][0]} · Beta 測試版</small>
              </span>
              <span className="more-arrow" aria-hidden="true">
                <ArrowRight size={21} weight="bold" />
              </span>
            </button>
          </div>
        </div>
        <p className="more-device-note">練習紀錄與設定只存在目前的裝置，不需要登入。</p>
      </section>
    );

  return (
    <section className="page-section more-page more-detail-page">
      <button type="button" className="more-back" onClick={() => setMorePanel("home")}>
        <ArrowLeft size={19} aria-hidden="true" /> 更多
      </button>
      {morePanel === "listening" && (
        <div id="listening-settings" className="more-detail-content">
          <h1>聽寫設定</h1>
          <p className="more-detail-intro">
            一般題 30 秒；較長的圈詞會有更多書寫時間。設定只留在這台裝置。
          </p>
          <div className="more-setting-group">
            <fieldset>
              <legend>每題播放幾次</legend>
              <div className="settings-options">
                {([1, 2, 3] as const).map((count) => (
                  <button
                    type="button"
                    key={count}
                    aria-pressed={listeningSettings.repeatCount === count}
                    onClick={() =>
                      setListeningSettings((current) => ({ ...current, repeatCount: count }))
                    }
                  >
                    {count} 次
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>唸完後，隔多久再唸</legend>
              <div className="settings-options">
                {([5, 8, 10] as const).map((seconds) => (
                  <button
                    type="button"
                    key={seconds}
                    aria-pressed={listeningSettings.intervalSeconds === seconds}
                    onClick={() =>
                      setListeningSettings((current) => ({ ...current, intervalSeconds: seconds }))
                    }
                  >
                    {seconds} 秒
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          <p className="more-detail-footnote">作答時可按「再聽一次」；這不會改變上方設定。</p>
        </div>
      )}
      {morePanel === "help" && (
        <div className="more-detail-content">
          <h1>使用說明</h1>
          <div className="help-steps">
            <section>
              <span>01</span>
              <div>
                <h2>選一課開始</h2>
                <p>每課有課文默寫與聽寫。可以先看課文預覽，再選要練的方式。</p>
              </div>
            </section>
            <section>
              <span>02</span>
              <div>
                <h2>課文默寫</h2>
                <p>點空格寫完整注音。整篇完成後請家長對照；標記需要重寫的字會留在練習頁。</p>
              </div>
            </section>
            <section>
              <span>03</span>
              <div>
                <h2>聽寫與補強</h2>
                <p>
                  按「開始聽」播放題目，寫完交給家長檢查。需要補強的題目可現在練，也可稍後從練習頁重練。
                </p>
              </div>
            </section>
          </div>
          <button type="button" className="more-primary-link" onClick={() => setView("courses")}>
            前往課程 <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      )}
      {morePanel === "versions" && (
        <div className="more-detail-content">
          <h1>版本</h1>
          <p className="more-detail-intro">
            網站目前仍在 Beta 測試階段，版本依 SemVer 格式記錄。開發過程中的細項更新可在{" "}
            <a
              href="https://github.com/KakuKain/zhuyin-practice-station/commits/main/"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub 提交紀錄
            </a>
            查看。
          </p>
          <div className="version-list">
            {siteReleaseNotes.map(([version, title, description], index) => (
              <details key={version} open={index === 0}>
                <summary>
                  <span>{version}</span>
                  <strong>{title}</strong>
                  <span className="version-chevron">⌄</span>
                </summary>
                <p>{description}</p>
              </details>
            ))}
          </div>
          <p className="more-audio-credit">
            單個注音符號讀音來源：
            <a
              href="https://language.moe.gov.tw/001/Upload/files/site_content/M0001/juyin/"
              target="_blank"
              rel="noopener noreferrer"
            >
              教育部《國語注音符號手冊》
            </a>
            ，依{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/deed.zh_TW"
              target="_blank"
              rel="noopener noreferrer"
            >
              CC BY 4.0
            </a>{" "}
            授權使用；網站已轉為 M4A，單個注音符號以正常速度播放。
          </p>
        </div>
      )}
    </section>
  );
}
