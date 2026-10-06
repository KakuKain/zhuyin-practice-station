"use client";

import { FreeDictation } from "./FreeDictation";
import { ProgressiveImage } from "../../components/ProgressiveImage";

import { useState } from "react";
import {
  ArrowRight,
  CaretDown,
  CaretUp,
  Headphones,
  PencilLine,
  ArrowClockwise,
} from "@phosphor-icons/react";
import { ShowMsg } from "../../components/ShowMsg";
import { FavoriteButton } from "../../components/ReviewActions";
import { PageHeading } from "../../components/PageHeading";
import { SoundPractice } from "../sound-practice/SoundPractice";
import { useCatalog } from "../courses/MaterialContext";
import { findQuestionSeed } from "../listening/listening-data";
import { fillFavoriteKey } from "./practice-storage";
import type { AppController } from "../usePracticeApp";

type Filter = "all" | "fill" | "listening";
export function PracticeList({ app }: { app: AppController }) {
  const catalog = useCatalog();
  const [tab, setTab] = useState<"free" | "records" | "sound">("free");
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<number | null | undefined>(undefined);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const entries = [
    ...app.fillFavorites.map((favorite) => ({
      key: `fill:${fillFavoriteKey(favorite)}`,
      lessonIndex: favorite.lessonIndex,
      mode: "fill" as const,
      word: favorite.character,
      pending: favorite.status === "needs_rewrite",
      mastered: favorite.status === "mastered",
      saved: favorite.isFavorite !== false,
      open: () => app.openFillFavorite(favorite),
      toggle: () => {
        if (favorite.isFavorite !== false) app.removeFillFavorite(favorite);
        else app.saveFillFavorite(favorite);
      },
    })),
    ...app.practiceState.savedQuestions.flatMap((saved) => {
      const question = findQuestionSeed(saved.lessonIndex, saved.questionId, catalog);
      if (!question) return [];
      return [
        {
          key: `listen:${saved.lessonIndex}:${saved.questionId}`,
          lessonIndex: saved.lessonIndex,
          mode: "listening" as const,
          word: question.audioText,
          pending: Boolean(saved.needsPractice),
          mastered: false,
          saved: saved.isFavorite,
          open: () => app.openSavedQuestion(saved.lessonIndex, saved.questionId),
          toggle: () => {
            app.setUnfavoriteFillUndo(null);
            app.toggleSavedQuestion(saved.lessonIndex, saved.questionId, saved.isFavorite);
          },
        },
      ];
    }),
  ]
    .filter((entry) => filter === "all" || entry.mode === filter)
    .sort((a, b) => Number(b.pending) - Number(a.pending));
  const groups = catalog.filter((lesson) =>
    entries.some((entry) => entry.lessonIndex === lesson.index),
  );
  const defaultExpanded = groups.some((group) => group.index === app.practiceState.recentLesson)
    ? app.practiceState.recentLesson
    : groups[0]?.index;
  const activeGroup = expanded === undefined ? defaultExpanded : expanded;
  const history = app.practiceState.history.filter(
    (session) =>
      catalog.some((lesson) => lesson.index === session.lessonIndex) &&
      (filter === "all" ||
        (filter === "fill" ? session.mode === "fill" : session.mode === "listening")),
  );
  return (
    <section
      className={`page-section practice-page practice-grouped-page${tab === "sound" ? " is-sound-tab" : ""}`}
    >
      <PageHeading title="練習" artwork="/course-art/happy-watercolor.webp" />
      <div className="practice-section-tabs" role="group" aria-label="練習功能">
        {(
          [
            ["free", "自由聽寫"],
            ["records", "練習紀錄"],
            ["sound", "辨音練習"],
          ] as const
        ).map(([value, label]) => (
          <button
            type="button"
            key={value}
            aria-pressed={tab === value}
            onClick={() => {
              app.stopPlayback();
              setTab(value);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "free" ? (
        <FreeDictation />
      ) : tab === "sound" ? (
        <SoundPractice audio={app} />
      ) : (
        <>
          <div className="practice-mode-tabs" role="group" aria-label="篩選練習類型">
            {(
              [
                ["all", "全部"],
                ["fill", "默寫"],
                ["listening", "聽寫"],
              ] as const
            ).map(([value, label]) => (
              <button
                type="button"
                key={value}
                aria-pressed={filter === value}
                onClick={() => {
                  setFilter(value);
                  setExpanded(undefined);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <ShowMsg
            error
            message={
              app.storageError ? "這個瀏覽器目前無法儲存收藏；關閉頁面後，紀錄可能會消失。" : ""
            }
          />
          <ShowMsg
            message={app.practiceNotice}
            onClose={() => {
              app.setPracticeNotice("");
              app.setUnfavoriteUndo(null);
              app.setUnfavoriteFillUndo(null);
            }}
          >
            {(app.unfavoriteUndo || app.unfavoriteFillUndo) && (
              <button
                type="button"
                onClick={app.unfavoriteFillUndo ? app.undoFillUnfavorite : app.undoUnfavorite}
              >
                復原取消收藏
              </button>
            )}
          </ShowMsg>
          <div className="practice-course-groups">
            {groups.map((lesson) => {
              const rows = entries.filter((entry) => entry.lessonIndex === lesson.index);
              const pending = rows.filter((entry) => entry.pending).length;
              const open = activeGroup === lesson.index;
              return (
                <section className="practice-course-group" key={lesson.index}>
                  <button
                    type="button"
                    className="practice-course-toggle"
                    aria-expanded={open}
                    aria-controls={`practice-course-${lesson.index}`}
                    onClick={() => setExpanded(open ? null : lesson.index)}
                  >
                    {lesson.artwork && (
                      <ProgressiveImage
                        src={`/course-art/${lesson.artwork}-watercolor.webp`}
                        alt=""
                      />
                    )}
                    <span>
                      <strong>
                        {lesson.listeningOnly
                          ? lesson.title
                          : `第${lesson.number}課 ${lesson.title}`}
                      </strong>
                      <small className={pending ? "practice-pending" : "practice-count-neutral"}>
                        {pending ? `${pending} 題待補強` : `${rows.length} 題收藏`}
                      </small>
                    </span>
                    {open ? (
                      <CaretUp size={24} aria-hidden="true" />
                    ) : (
                      <CaretDown size={24} aria-hidden="true" />
                    )}
                  </button>
                  {open && (
                    <div id={`practice-course-${lesson.index}`} className="practice-course-content">
                      {rows.map((entry) => (
                        <div className="practice-item" key={entry.key}>
                          <FavoriteButton
                            iconOnly
                            saved={entry.saved}
                            className="practice-star"
                            ariaLabel={`${entry.saved ? "取消收藏" : "收藏"}${entry.word}`}
                            onToggle={entry.toggle}
                          />
                          <button
                            className="practice-item-open"
                            type="button"
                            onClick={entry.open}
                            aria-label={`重練${entry.word}（${entry.mode === "fill" ? "默寫" : "聽寫"}）`}
                          >
                            <strong>{entry.word}</strong>
                            <span className={`practice-mode-label mode-${entry.mode}`}>
                              {entry.mode === "fill" ? "默寫" : "聽寫"}
                            </span>
                            <small
                              className={entry.pending ? "practice-pending" : "practice-mastered"}
                            >
                              {entry.pending ? "待補強" : entry.mastered ? "已掌握" : "待複習"}
                            </small>
                          </button>
                          <button
                            className="practice-item-arrow"
                            type="button"
                            aria-label={`開啟${entry.word}重練`}
                            onClick={entry.open}
                          >
                            <ArrowRight size={22} aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                      {pending > 0 && (
                        <button
                          type="button"
                          className="practice-course-retry"
                          onClick={() => app.startCourseReview(lesson.index, filter)}
                        >
                          <ArrowClockwise size={22} aria-hidden="true" />
                          重練待補強 {pending} 題
                        </button>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
            {groups.length === 0 && (
              <div className="practice-group-empty">
                <p>
                  目前沒有{filter === "fill" ? "默寫" : filter === "listening" ? "聽寫" : ""}
                  待補強或收藏題目
                </p>
                <button type="button" onClick={() => app.setView("courses")}>
                  前往課程
                  <ArrowRight size={20} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
          <section className="practice-recent-section">
            <div className="practice-recent-heading">
              <h2>最近完成</h2>
              {history.length > 3 && (
                <button
                  type="button"
                  aria-expanded={showAllHistory}
                  onClick={() => setShowAllHistory((value) => !value)}
                >
                  {showAllHistory ? "收合" : "查看全部"}
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              )}
            </div>
            {history.length === 0 && (
              <p className="practice-no-recent">完成練習後，這裡會留下紀錄。</p>
            )}
            {(showAllHistory ? history : history.slice(0, 3)).map((session) => {
              const lesson = catalog.find((lesson) => lesson.index === session.lessonIndex)!;
              return (
                <button
                  className="practice-recent-row"
                  type="button"
                  key={session.id}
                  onClick={() => app.openLesson(session.lessonIndex)}
                >
                  <span
                    className={`practice-recent-icon mode-${session.mode === "listening" ? "listening" : "fill"}`}
                  >
                    {session.mode === "listening" ? (
                      <Headphones size={24} aria-hidden="true" />
                    ) : (
                      <PencilLine size={24} aria-hidden="true" />
                    )}
                  </span>
                  <span>
                    <strong>
                      {lesson.listeningOnly ? lesson.title : `第${lesson.number}課`} ·{" "}
                      {session.mode === "fill"
                        ? "默寫"
                        : session.mode === "single"
                          ? "單題重練"
                          : "聽寫"}
                    </strong>
                    <small>
                      {new Date(session.completedAt).toLocaleDateString("zh-TW", {
                        month: "numeric",
                        day: "numeric",
                        timeZone: "Asia/Taipei",
                      })}{" "}
                      ·{" "}
                      {session.pendingQuestions
                        ? `${session.pendingQuestions} 題待補強`
                        : `${session.correctUnits} 格完成`}
                    </small>
                  </span>
                  <ArrowRight size={22} aria-hidden="true" />
                </button>
              );
            })}
          </section>
        </>
      )}
    </section>
  );
}
