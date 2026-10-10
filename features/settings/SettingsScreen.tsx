import { ShowMsg } from "../../components/ShowMsg";
import { HeaderBack } from "../../components/AppChrome";

import { PageHeading } from "../../components/PageHeading";
import type { AppController } from "../usePracticeApp";
import { lazy, Suspense, useState } from "react";
import type { ListeningSettings } from "../types";
import {
  DownloadSimple,
  BookOpenText,
  ArrowRight,
  Info,
  Microphone,
  MusicNotes,
  Question,
} from "@phosphor-icons/react";
import { siteReleaseNotes } from "../courses/course-data";
import {
  checkForUpdate,
  loadLatestVersion,
  runningBuild,
  runningBuildDate,
  useUpdateStatus,
  type UpdateState,
} from "../../lib/loading/app-update";
import { isInstalledApp } from "../navigation/useBackGesture";

const shortBuild = (build: string) => (/^[0-9a-f]{12}$/.test(build) ? build.slice(0, 7) : build);
const time = (at: number | null) =>
  at === null
    ? ""
    : new Date(at).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
function updateMessage({ status, latestBuild, checkedAt }: UpdateState) {
  if (status === "checking") return "正在檢查…";
  if (status === "available")
    return `有新版本（版次 ${shortBuild(latestBuild ?? "")}），可按「更新到最新版」。`;
  if (status === "current") return `已是最新版本（${time(checkedAt)} 檢查）。`;
  if (status === "offline") return "目前無法連線檢查，請確認網路後再試。";
  return "尚未檢查。";
}
const MaterialsPanel = lazy(() =>
  import("./MaterialsPanel").then((module) => ({ default: module.MaterialsPanel })),
);
import { builtinMaterialName } from "../courses/materials";
// Feature styles load with the chunk (after every eager stylesheet), not on first paint.
const CustomAudioPanel = lazy(() =>
  Promise.all([import("./CustomAudioPanel"), import("../../styles/lazy/custom-audio.css")]).then(
    ([module]) => ({ default: module.CustomAudioPanel }),
  ),
);

const DeviceBackupPanel = lazy(() =>
  import("./DeviceBackupPanel").then((module) => ({ default: module.DeviceBackupPanel })),
);

/** Which build is running, how the app was opened, and a manual way to get the newest one. */
function VersionStatus() {
  const update = useUpdateStatus();
  const installed = isInstalledApp();
  return (
    <section className="version-status" aria-label="目前版本">
      <dl>
        <div>
          <dt>版本</dt>
          <dd>{siteReleaseNotes[0][0]}</dd>
        </div>
        <div>
          <dt>版次</dt>
          <dd>
            {shortBuild(runningBuild)}
            {runningBuildDate && ` · ${runningBuildDate}`}
          </dd>
        </div>
        <div>
          <dt>開啟方式</dt>
          <dd>
            {installed
              ? "主畫面 App（全螢幕、固定直式）"
              : "瀏覽器分頁：從主畫面的 App 圖示開啟才會全螢幕、固定直式"}
          </dd>
        </div>
        <div>
          <dt>更新</dt>
          <dd role="status">{updateMessage(update)}</dd>
        </div>
      </dl>
      <div className="backup-actions">
        <button
          type="button"
          className="secondary-button"
          disabled={update.status === "checking"}
          onClick={() => void checkForUpdate()}
        >
          檢查更新
        </button>
        <button type="button" className="primary-button" onClick={loadLatestVersion}>
          {update.status === "available" ? "更新到最新版" : "重新載入最新版"}
        </button>
      </div>
    </section>
  );
}

export function SettingsScreen({
  app,
}: {
  app: Pick<
    AppController,
    | "materialsState"
    | "setMaterialsState"
    | "materialsStorageError"
    | "catalog"
    | "listeningSettings"
    | "morePanel"
    | "setListeningSettings"
    | "setMorePanel"
    | "setView"
    | "settingsStorageError"
    | "customAudio"
    | "speak"
    | "stopPlayback"
    | "audioLoading"
    | "audioError"
  >;
}) {
  const {
    listeningSettings,
    morePanel,
    setListeningSettings,
    setMorePanel,
    setView,
    settingsStorageError,
  } = app;
  const [saveRequested, setSaveRequested] = useState(false);
  const { status: updateStatus } = useUpdateStatus();
  const updateSettings = (patch: Partial<ListeningSettings>) => {
    setListeningSettings((current) => ({ ...current, ...patch }));
    setSaveRequested(true);
  };

  if (morePanel === "home")
    return (
      <section className="page-section more-page">
        <PageHeading title="更多" artwork="course-art/swan-riding-family-watercolor.webp" />
        <div className="more-group">
          <h2>練習設定</h2>
          <div className="more-settings-list">
            <button type="button" onClick={() => setMorePanel("materials")}>
              <span className="more-row-icon green">
                <BookOpenText size={21} aria-hidden="true" />
              </span>
              <span>
                <strong>教材與題庫</strong>
                <small>
                  {app.materialsState.materials.find(
                    (item) => item.id === app.materialsState.activeId && !item.archived,
                  )?.name ?? builtinMaterialName}{" "}
                  · 選擇或匯入
                </small>
              </span>
              <span className="more-arrow" aria-hidden="true">
                <ArrowRight size={21} weight="bold" />
              </span>
            </button>
            <button type="button" onClick={() => setMorePanel("listening")}>
              <span className="more-row-icon blue">
                <MusicNotes size={21} aria-hidden="true" />
              </span>
              <span>
                <strong>聽寫設定</strong>
                <small>
                  播放 {listeningSettings.repeatCount} 次 · 間隔 {listeningSettings.intervalSeconds}{" "}
                  秒 · {listeningSettings.answerTime === "relaxed" ? "寬鬆作答" : "一般作答"}
                </small>
              </span>
              <span className="more-arrow" aria-hidden="true">
                <ArrowRight size={21} weight="bold" />
              </span>
            </button>
            <button type="button" onClick={() => setMorePanel("audio")}>
              <span className="more-row-icon blue">
                <Microphone size={21} aria-hidden="true" />
              </span>
              <span>
                <strong>自訂讀音</strong>
                <small>錄製或匯入清楚的生字、語詞讀音</small>
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
            <button type="button" onClick={() => setMorePanel("backup")}>
              <span className="more-row-icon green">
                <DownloadSimple size={21} aria-hidden="true" />
              </span>
              <span>
                <strong>裝置備份</strong>
                <small>保存教材、練習與錄音</small>
              </span>
              <span className="more-arrow" aria-hidden="true">
                <ArrowRight size={21} weight="bold" />
              </span>
            </button>
            <button type="button" onClick={() => setMorePanel("help")}>
              <span className="more-row-icon green">
                <Question size={21} aria-hidden="true" />
              </span>
              <span>
                <strong>使用說明</strong>
                <small>課文默寫、聽寫與單題重練</small>
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
                <small>
                  目前 {siteReleaseNotes[0][0]} · 版次 {shortBuild(runningBuild)}
                  {updateStatus === "available" && " · 有新版本"}
                </small>
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
      {morePanel !== "materials" && (
        <HeaderBack
          label="更多"
          onBack={() => {
            setSaveRequested(false);
            setMorePanel("home");
          }}
        />
      )}
      <Suspense fallback={<p role="status">正在準備教材…</p>}>
        {morePanel === "materials" && <MaterialsPanel app={app} />}
      </Suspense>
      {morePanel === "audio" && (
        <Suspense fallback={<p role="status">正在準備讀音…</p>}>
          <CustomAudioPanel
            audio={app.customAudio}
            speak={app.speak}
            stopPlayback={app.stopPlayback}
            audioLoading={app.audioLoading}
            audioError={app.audioError}
          />
        </Suspense>
      )}
      {morePanel === "backup" && (
        <Suspense fallback={<p role="status">正在準備備份…</p>}>
          <DeviceBackupPanel />
        </Suspense>
      )}
      {morePanel === "listening" && (
        <div id="listening-settings" className="more-detail-content">
          <h1>聽寫設定</h1>
          <p className="more-detail-intro">
            聲音速度不變；可以依孩子的書寫速度調整時間。設定只留在這台裝置。
          </p>
          <ShowMsg
            message={
              saveRequested
                ? settingsStorageError
                  ? "這台裝置無法儲存設定；目前頁面仍會使用你的選擇。"
                  : "已儲存到這台裝置"
                : ""
            }
            error={Boolean(settingsStorageError)}
            onClose={() => setSaveRequested(false)}
          />
          <div className="more-setting-group">
            <fieldset>
              <legend>作答時間</legend>
              <div className="settings-options answer-time-options">
                {(["standard", "relaxed"] as const).map((answerTime) => (
                  <button
                    type="button"
                    key={answerTime}
                    aria-pressed={listeningSettings.answerTime === answerTime}
                    onClick={() => updateSettings({ answerTime })}
                  >
                    {answerTime === "standard" ? "一般 · 30 秒起" : "寬鬆 · 60 秒起"}
                  </button>
                ))}
              </div>
              <p className="more-detail-footnote">
                較長的語詞會自動增加時間；寬鬆模式提供兩倍時間。
              </p>
            </fieldset>
            <fieldset>
              <legend>每題播放幾次</legend>
              <div className="settings-options">
                {([1, 2, 3] as const).map((count) => (
                  <button
                    type="button"
                    key={count}
                    aria-pressed={listeningSettings.repeatCount === count}
                    onClick={() => updateSettings({ repeatCount: count })}
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
                    onClick={() => updateSettings({ intervalSeconds: seconds })}
                  >
                    {seconds} 秒
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          <p className="more-detail-footnote">
            倒數從第一次播放開始，包含播放與間隔時間。手動「再聽一次」不會重設倒數或改變設定。
          </p>
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
                <p>點空格寫完整注音。整篇完成後請家長對照；黃色星星是收藏，可從練習頁重練。</p>
              </div>
            </section>
            <section>
              <span>03</span>
              <div>
                <h2>聽寫與補強</h2>
                <p>
                  按「開始聽」播放題目，寫完交給家長檢查。需要補強的題目可現在練，也可稍後從練習頁重練。
                  取消收藏不會移除待補強；家長確認重寫答對後，才會移出待補強。
                </p>
              </div>
            </section>
            <section>
              <span>04</span>
              <div>
                <h2>聽全部注音</h2>
                <p>下方「注音」收錄 37 個符號，分成聲符與韻符。點符號可聽正常速度的讀音。</p>
                <button
                  type="button"
                  className="more-primary-link"
                  onClick={() => setView("symbols")}
                >
                  前往注音 <ArrowRight size={18} aria-hidden="true" />
                </button>
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
          <VersionStatus />
          <p className="more-detail-intro">
            網站目前仍在 Beta 測試階段，版本號用來區分每次功能更新。開發過程中的細項更新可在{" "}
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
