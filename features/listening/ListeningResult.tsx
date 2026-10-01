"use client";

import type { AppController } from "../usePracticeApp";
import { Headphones, PencilLine } from "@phosphor-icons/react";

export function ListeningResult({
  app,
}: {
  app: Pick<
    AppController,
    | "completedFillLessons"
    | "lessonNumber"
    | "openListening"
    | "pendingSessionCount"
    | "selectedLesson"
    | "sessionScore"
    | "sessionWritingUnits"
    | "setView"
  >;
}) {
  const {
    completedFillLessons,
    lessonNumber,
    openListening,
    pendingSessionCount,
    selectedLesson,
    sessionScore,
    sessionWritingUnits,
    setView,
  } = app;
  return (
    <section className="page-section result-page">
      <div className="result-celebration">
        <span className="result-spark">✦</span>
        <div className="result-check">✓</div>
        <span className="result-spark right">✦</span>
      </div>
      <span className="eyebrow">PRACTICE COMPLETE</span>
      <h1>練習完成！</h1>
      <p className="result-intro">今天的第{lessonNumber}課，你已經往前走了一小步。</p>
      <div className="result-card">
        <div>
          <span className="result-icon fill">
            <PencilLine size={22} weight="duotone" />
          </span>
          <span>
            <strong>課文默寫</strong>
            <small>
              直式注音格 · {completedFillLessons.includes(selectedLesson) ? "已完成" : "尚未練習"}
            </small>
          </span>
          <b>{completedFillLessons.includes(selectedLesson) ? "✓" : "—"}</b>
        </div>
        <div>
          <span className="result-icon listen">
            <Headphones size={22} weight="duotone" />
          </span>
          <span>
            <strong>聽寫</strong>
            <small>
              三大題 · {sessionScore.listeningCorrect} / {sessionWritingUnits} 格完成
            </small>
          </span>
          <b>✓</b>
        </div>
      </div>
      <div className="result-note">
        <span>☼</span>
        <p>
          <strong>待補強：{pendingSessionCount} 題</strong>
          <small>
            {pendingSessionCount
              ? "題目已留在「練習」，可以稍後單題重練。"
              : "這次沒有待補強的題目；收藏的題目仍可在「練習」重練。"}
          </small>
        </p>
      </div>
      <div className="result-actions">
        <button className="primary-button" type="button" onClick={openListening}>
          再練一次 <span>↻</span>
        </button>
        <button className="secondary-button" type="button" onClick={() => setView("practice")}>
          查看收藏
        </button>
        <button className="secondary-button" type="button" onClick={() => setView("lesson")}>
          回到課次
        </button>
      </div>
    </section>
  );
}
