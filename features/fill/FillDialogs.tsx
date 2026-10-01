"use client";

import type { AppController } from "../usePracticeApp";

export function FillDialogs({
  app,
}: {
  app: Pick<
    AppController,
    | "fillExitTarget"
    | "fillResumeDraft"
    | "leaveFill"
    | "lesson"
    | "lessonNumber"
    | "lessonItems"
    | "restartFillDraft"
    | "resumeFillDraft"
    | "setFillExitTarget"
    | "storageError"
  >;
}) {
  const {
    fillExitTarget,
    fillResumeDraft,
    leaveFill,
    lesson,
    lessonNumber,
    lessonItems,
    restartFillDraft,
    resumeFillDraft,
    setFillExitTarget,
    storageError,
  } = app;

  if (fillResumeDraft)
    return (
      <div className="fill-dialog-backdrop">
        <div
          className="fill-dialog"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="fill-resume-title"
          aria-describedby="fill-resume-description"
        >
          <span className="fill-dialog-eyebrow">上次的進度</span>
          <h2 id="fill-resume-title">要繼續上次的默寫嗎？</h2>
          <p id="fill-resume-description">
            第{lessonNumber}課「{lesson.title}」的筆跡已保存在這台裝置。 已寫{" "}
            {Object.values(fillResumeDraft.strokes).filter((strokes) => strokes.length > 0).length}{" "}
            / {lessonItems.length} 格
            {Object.keys(fillResumeDraft.pendingCells).length > 0 &&
              `，另有 ${Object.keys(fillResumeDraft.pendingCells).length} 格未完成`}
            。
          </p>
          <button className="fill-dialog-primary" type="button" autoFocus onClick={resumeFillDraft}>
            繼續默寫
          </button>
          <button className="fill-dialog-secondary" type="button" onClick={restartFillDraft}>
            重新開始
          </button>
        </div>
      </div>
    );
  if (fillExitTarget)
    return (
      <div className="fill-dialog-backdrop">
        <div
          className="fill-dialog"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="fill-exit-title"
          aria-describedby="fill-exit-description"
        >
          <span className="fill-dialog-eyebrow">課文默寫</span>
          <h2 id="fill-exit-title">要先離開默寫嗎？</h2>
          <p id="fill-exit-description">
            {storageError
              ? "這台裝置目前無法保存筆跡，離開後可能會消失。"
              : "目前寫好的內容已自動保存。下次進來，可以繼續寫。"}
          </p>
          <button
            className="fill-dialog-primary"
            type="button"
            autoFocus
            onClick={() => setFillExitTarget(null)}
          >
            留下繼續寫
          </button>
          <button className="fill-dialog-secondary" type="button" onClick={leaveFill}>
            {storageError ? "仍要離開" : "儲存並離開"}
          </button>
        </div>
      </div>
    );
  return null;
}
