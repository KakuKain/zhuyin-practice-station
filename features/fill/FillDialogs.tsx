import type { AppController } from "../usePracticeApp";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { isFillCellComplete } from "./fill-draft-policy";

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
      <ConfirmDialog
        id="fill-resume"
        eyebrow="上次的進度"
        title="要繼續上次的默寫嗎？"
        primaryLabel="繼續默寫"
        onPrimary={resumeFillDraft}
        secondaryLabel="重新開始"
        onSecondary={restartFillDraft}
      >
        第{lessonNumber}課「{lesson.title}」的筆跡已保存在這台裝置。 已寫{" "}
        {
          lessonItems.filter((_, index) =>
            isFillCellComplete(index, fillResumeDraft.strokes, fillResumeDraft.pendingCells),
          ).length
        }{" "}
        / {lessonItems.length} 格
        {Object.keys(fillResumeDraft.pendingCells).length > 0 &&
          `，另有 ${Object.keys(fillResumeDraft.pendingCells).length} 格未完成`}
        。
      </ConfirmDialog>
    );
  if (fillExitTarget)
    return (
      <ConfirmDialog
        id="fill-exit"
        eyebrow="課文默寫"
        title="要先離開默寫嗎？"
        primaryLabel="留下繼續寫"
        onPrimary={() => setFillExitTarget(null)}
        secondaryLabel={storageError ? "仍要離開" : "儲存並離開"}
        onSecondary={leaveFill}
      >
        {storageError
          ? "這台裝置目前無法保存筆跡，離開後可能會消失。"
          : "目前寫好的內容已自動保存。下次進來，可以繼續寫。"}
      </ConfirmDialog>
    );
  return null;
}
