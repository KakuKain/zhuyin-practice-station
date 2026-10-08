"use client";
import { useState } from "react";
import { DownloadSimple, UploadSimple } from "@phosphor-icons/react";
import { ShowMsg } from "../../components/ShowMsg";
import {
  createDeviceBackup,
  prepareDeviceBackup,
  restoreDeviceBackup,
  maxBackupBytes,
  type DeviceBackup,
  type PreparedBackup,
} from "../../lib/storage/device-backup";

function download(backup: DeviceBackup, prefix = "注音小練習備份") {
  const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
  if (blob.size > maxBackupBytes) throw new Error("備份超過 64 MB，請先移除不需要的錄音。");
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = `${prefix}-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  // Safari may wait for the save prompt before reading the file.
  setTimeout(() => URL.revokeObjectURL(url), 120000);
}
export function DeviceBackupPanel() {
  const [pending, setPending] = useState<PreparedBackup | null>(null);
  // The safety copy is its own step: restoring reloads the page, which could cut a
  // download that is still waiting for the browser's save prompt.
  const [safetySaved, setSafetySaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage("");
    setFailed(false);
    try {
      await action();
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "備份未完成，請再試一次。");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="more-detail-content device-backup">
      <h1>裝置備份</h1>
      <p>一起保存教材、收藏、默寫草稿、畫作與自訂錄音。</p>
      <ShowMsg message={message} error={failed} onClose={() => setMessage("")} />
      <div className="backup-actions">
        <button
          type="button"
          className="primary-button"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              download(await createDeviceBackup());
              setMessage("已下載備份，請保留這個檔案。");
            })
          }
        >
          <DownloadSimple size={22} aria-hidden="true" />
          下載備份
        </button>
        <label className="secondary-button">
          <UploadSimple size={22} aria-hidden="true" />
          選擇備份檔
          <input
            aria-label="選擇裝置備份檔"
            type="file"
            accept="application/json,.json"
            disabled={busy}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              setPending(null);
              setSafetySaved(false);
              if (file)
                void run(async () => {
                  if (file.size > maxBackupBytes) throw new Error("請選擇 64 MB 以下的備份。");
                  setPending(prepareDeviceBackup(JSON.parse(await file.text())));
                });
            }}
          />
        </label>
      </div>
      {pending && (
        <section className="backup-preview" aria-label="備份內容預覽">
          <h2>確認還原內容</h2>
          <p>{new Date(pending.backup.createdAt).toLocaleString("zh-TW")}</p>
          <dl>
            {Object.entries({
              自訂教材: pending.summary.materials,
              收藏與補強: pending.summary.saved,
              默寫草稿: pending.summary.drafts,
              畫板筆畫: pending.summary.strokes,
              自訂錄音: pending.summary.recordings,
            }).map(([label, count]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{count}</dd>
              </div>
            ))}
          </dl>
          {pending.summary.unreadable > 0 && (
            <p>有 {pending.summary.unreadable} 項內容這個版本無法讀取，會原樣保留。</p>
          )}
          <p>
            還原會取代目前資料。請先下載目前資料，確認檔案已儲存，再開始還原；完成後會自動重新整理。
          </p>
          <div className="backup-actions">
            <button
              type="button"
              className={safetySaved ? "secondary-button" : "primary-button"}
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  download(await createDeviceBackup(), "還原前備份");
                  setSafetySaved(true);
                })
              }
            >
              <DownloadSimple size={22} aria-hidden="true" />
              {safetySaved ? "再次下載目前資料" : "1. 下載目前資料"}
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={busy || !safetySaved}
              onClick={() =>
                void run(async () => {
                  await restoreDeviceBackup(pending);
                  // Reload every in-memory store and recording cache together.
                  window.location.reload();
                })
              }
            >
              2. 開始還原
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={busy}
              onClick={() => {
                setPending(null);
                setSafetySaved(false);
              }}
            >
              取消
            </button>
          </div>
        </section>
      )}
      {busy && <p role="status">正在處理備份…</p>}
      <p className="more-detail-footnote">
        檔案含孩子的畫作與錄音，請保存在自己的裝置。還原期間請保持頁面開啟。
      </p>
    </div>
  );
}
